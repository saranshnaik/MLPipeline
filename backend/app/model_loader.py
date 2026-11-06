"""Load the churn model either from the MLflow Model Registry or from a local pickle.

MODEL_URI selects the source:
    models:/telco-churn@champion   -> MLflow registry (alias), needs MLFLOW_TRACKING_* env vars
    models:/telco-churn/3          -> MLflow registry (fixed version)
    /path/to/model.pkl             -> local joblib file (used by tests and local dev)
If MODEL_URI is unset, backend/model/model.pkl is used. Loading failures are raised so the
application fails fast at startup instead of serving a stale or missing model.
"""
import os
import re
from pathlib import Path

import joblib

from app.schemas import ModelInfo

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH = BACKEND_DIR / "model" / "model.pkl"

_REGISTRY_URI = re.compile(r"^models:/(?P<name>[^/@]+)(?:@(?P<alias>[^/@]+)|/(?P<version>\d+))$")


def parse_registry_uri(uri: str) -> tuple[str, str | None, str | None]:
    """Return (name, alias, version) for models:/name@alias or models:/name/version."""
    match = _REGISTRY_URI.match(uri)
    if not match:
        raise ValueError(
            f"Unsupported MODEL_URI {uri!r}; expected models:/<name>@<alias>, "
            "models:/<name>/<version> or a path to a .pkl file"
        )
    return match["name"], match["alias"], match["version"]


def _load_from_registry(uri: str):
    name, alias, version = parse_registry_uri(uri)
    if not os.getenv("MLFLOW_TRACKING_URI"):
        raise RuntimeError("MLFLOW_TRACKING_URI must be set to load a model from the registry")

    # Imported lazily so local-pickle runs (and tests) never touch MLflow.
    import mlflow
    import mlflow.sklearn
    from mlflow import MlflowClient

    mlflow.set_tracking_uri(os.environ["MLFLOW_TRACKING_URI"])
    client = MlflowClient()
    if alias:
        model_version = client.get_model_version_by_alias(name, alias)
    else:
        model_version = client.get_model_version(name, version)

    # Load the exact resolved version so info and model can never disagree.
    model = mlflow.sklearn.load_model(f"models:/{name}/{model_version.version}")
    info = ModelInfo(
        source="registry",
        name=name,
        version=str(model_version.version),
        run_id=model_version.run_id,
        uri=uri,
    )
    return model, info


def _load_local(path: Path):
    if not path.is_file():
        raise FileNotFoundError(f"Model file not found: {path}")
    model = joblib.load(path)
    info = ModelInfo(source="local", name=path.stem, version=None, run_id=None, uri=str(path))
    return model, info


def load_model(uri: str | None = None):
    """Return (model, ModelInfo). Raises if the model cannot be loaded."""
    uri = uri or os.getenv("MODEL_URI") or str(DEFAULT_MODEL_PATH)
    if uri.startswith("models:/"):
        return _load_from_registry(uri)
    return _load_local(Path(uri))
