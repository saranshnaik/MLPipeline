import pytest

from app import model_loader
from app.main import get_allowed_origins


def test_parse_registry_uri_alias():
    assert model_loader.parse_registry_uri("models:/telco-churn@champion") == (
        "telco-churn",
        "champion",
        None,
    )


def test_parse_registry_uri_version():
    assert model_loader.parse_registry_uri("models:/telco-churn/3") == ("telco-churn", None, "3")


@pytest.mark.parametrize(
    "uri",
    ["models:/", "models:/name", "models:/name/latest", "models:/a/b/c", "models:/name@"],
)
def test_parse_registry_uri_rejects_bad_uris(uri):
    with pytest.raises(ValueError):
        model_loader.parse_registry_uri(uri)


def test_missing_local_model_fails_fast(tmp_path):
    with pytest.raises(FileNotFoundError):
        model_loader.load_model(str(tmp_path / "nope.pkl"))


def test_registry_uri_requires_tracking_uri(monkeypatch):
    monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)
    with pytest.raises(RuntimeError, match="MLFLOW_TRACKING_URI"):
        model_loader.load_model("models:/telco-churn@champion")


def test_load_local_model_returns_info():
    model, info = model_loader.load_model(str(model_loader.DEFAULT_MODEL_PATH))
    assert hasattr(model, "predict_proba")
    assert info.source == "local"
    assert info.version is None


def test_allowed_origins_parsing(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", " https://a.com/ , http://localhost:3000,, ")
    assert get_allowed_origins() == ["https://a.com", "http://localhost:3000"]


def test_allowed_origins_default(monkeypatch):
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    assert get_allowed_origins() == ["http://localhost:3000"]
