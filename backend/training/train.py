"""Train the Telco churn pipeline, track it in MLflow (DagsHub) and register it.

Usage (from backend/):
    training/.venv/Scripts/python.exe training/train.py            # promote only if better
    training/.venv/Scripts/python.exe training/train.py --promote  # force @champion
    training/.venv/Scripts/python.exe training/train.py --C 0.5

Credentials come from backend/.env (MLFLOW_TRACKING_URI / _USERNAME / _PASSWORD).
"""
import argparse
import os
import urllib.request
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import joblib
import matplotlib.pyplot as plt
import mlflow
import numpy as np
import pandas as pd
from mlflow import MlflowClient
from mlflow.exceptions import MlflowException
from mlflow.models import infer_signature
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

HERE = Path(__file__).resolve().parent
BACKEND_DIR = HERE.parent
DEFAULT_DATA = HERE / "data" / "WA_Fn-UseC_-Telco-Customer-Churn.csv"
PICKLE_PATH = BACKEND_DIR / "model" / "model.pkl"
CHAMPION_ALIAS = "champion"
SKOPS_TRUSTED_TYPES = ["numpy.dtype", "sklearn.compose._column_transformer._RemainderColsList"]

NUMERIC_FEATURES = ["SeniorCitizen", "tenure", "MonthlyCharges", "TotalCharges"]


def load_env(path: Path) -> None:
    """Minimal .env loader (values are never printed)."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def load_data(path: Path):
    df = pd.read_csv(path)
    df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce")
    df = df.drop(columns=["customerID"])
    df = df.dropna(subset=["Churn"])
    X = df.drop(columns=["Churn"])
    y = df["Churn"].map({"No": 0, "Yes": 1})
    return X, y


def build_pipeline(categorical_features, C: float, max_iter: int, seed: int) -> Pipeline:
    numeric_pipeline = Pipeline(
        [("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
    )
    categorical_pipeline = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    preprocessor = ColumnTransformer(
        [
            ("numeric", numeric_pipeline, NUMERIC_FEATURES),
            ("categorical", categorical_pipeline, categorical_features),
        ]
    )
    return Pipeline(
        [
            ("preprocessing", preprocessor),
            ("model", LogisticRegression(C=C, max_iter=max_iter, random_state=seed)),
        ]
    )


def champion_metric(client: MlflowClient, model_name: str, metric: str):
    """Return (version, metric value) of the current @champion, or (None, None)."""
    try:
        mv = client.get_model_version_by_alias(model_name, CHAMPION_ALIAS)
    except MlflowException:
        return None, None
    value = client.get_run(mv.run_id).data.metrics.get(metric)
    return mv.version, value


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--experiment", default="telco-churn")
    parser.add_argument("--model-name", default="telco-churn")
    parser.add_argument("--C", type=float, default=1.0)
    parser.add_argument("--max-iter", type=int, default=1000)
    parser.add_argument("--test-size", type=float, default=0.20)
    parser.add_argument("--seed", type=int, default=80)
    parser.add_argument("--promote", action="store_true", help="set @champion even if not better")
    args = parser.parse_args()

    load_env(BACKEND_DIR / ".env")
    os.environ.setdefault("MLFLOW_DISABLE_AGENT_HINT", "1")
    if not os.environ.get("MLFLOW_TRACKING_URI"):
        raise SystemExit("MLFLOW_TRACKING_URI is not set (expected in backend/.env)")
    mlflow.set_tracking_uri(os.environ["MLFLOW_TRACKING_URI"])
    mlflow.set_experiment(args.experiment)
    client = MlflowClient()

    X, y = load_data(args.data)
    categorical_features = [c for c in X.columns if c not in NUMERIC_FEATURES]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=args.seed, stratify=y
    )
    print(f"Train: {len(X_train)}  Test: {len(X_test)}")

    pipeline = build_pipeline(categorical_features, args.C, args.max_iter, args.seed)

    with mlflow.start_run(run_name=f"logreg-C{args.C}") as run:
        mlflow.log_params(
            {
                "model": "LogisticRegression",
                "C": args.C,
                "max_iter": args.max_iter,
                "random_state": args.seed,
                "test_size": args.test_size,
                "n_train": len(X_train),
                "n_test": len(X_test),
            }
        )

        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        y_proba = pipeline.predict_proba(X_test)[:, 1]

        metrics = {
            "accuracy": accuracy_score(y_test, y_pred),
            "precision": precision_score(y_test, y_pred),
            "recall": recall_score(y_test, y_pred),
            "f1": f1_score(y_test, y_pred),
            "roc_auc": roc_auc_score(y_test, y_proba),
        }
        mlflow.log_metrics(metrics)
        for name, value in metrics.items():
            print(f"{name:10s}: {value:.4f}")

        # Artifacts
        mlflow.log_text(classification_report(y_test, y_pred), "classification_report.txt")
        fig, ax = plt.subplots(figsize=(4.5, 4))
        ConfusionMatrixDisplay.from_predictions(y_test, y_pred, ax=ax, colorbar=False)
        ax.set_title("Confusion matrix (test)")
        mlflow.log_figure(fig, "confusion_matrix.png")
        plt.close(fig)

        # Reproducibility check against the pickle currently shipped in the repo
        if PICKLE_PATH.exists():
            old = joblib.load(PICKLE_PATH)
            diff = float(np.max(np.abs(old.predict_proba(X_test)[:, 1] - y_proba)))
            same = bool(np.array_equal(old.predict(X_test), y_pred))
            mlflow.log_metric("max_proba_diff_vs_pickle", diff)
            print(f"vs model.pkl -> identical predictions: {same}, max |dP|: {diff:.2e}")

        info = mlflow.sklearn.log_model(
            pipeline,
            name="model",
            signature=infer_signature(X_test, y_proba),
            input_example=X_test.head(3),
            registered_model_name=args.model_name,
            skops_trusted_types=SKOPS_TRUSTED_TYPES,
        )
        run_id = run.info.run_id

    version = getattr(info, "registered_model_version", None)
    if version is None:
        version = max(int(m.version) for m in client.search_model_versions(f"name='{args.model_name}'"))
    version = str(version)
    print(f"Registered {args.model_name} v{version} (run {run_id})")

    # Promotion
    champ_version, champ_auc = champion_metric(client, args.model_name, "roc_auc")
    better = champ_auc is None or metrics["roc_auc"] > champ_auc
    if args.promote or better:
        client.set_registered_model_alias(args.model_name, CHAMPION_ALIAS, version)
        reason = "forced" if args.promote and not better else "better than current champion"
        if champ_version is None:
            reason = "first model"
        print(f"Promoted v{version} to @{CHAMPION_ALIAS} ({reason})")
        hook = os.environ.get("RENDER_DEPLOY_HOOK_URL")
        if hook:
            urllib.request.urlopen(urllib.request.Request(hook, method="POST"), timeout=30)
            print("Triggered Render deploy hook")
    else:
        print(
            f"Not promoted: roc_auc {metrics['roc_auc']:.4f} <= champion v{champ_version} ({champ_auc:.4f}). "
            "Use --promote to override."
        )


if __name__ == "__main__":
    main()
