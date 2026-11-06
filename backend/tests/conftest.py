import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Tests always run offline against the local pickle, even if the developer has MODEL_URI /
# MLFLOW_* exported in their shell. Set before the app module is imported.
os.environ["MODEL_URI"] = str(BACKEND_DIR / "model" / "model.pkl")
os.environ["ALLOWED_ORIGINS"] = "http://localhost:3000,https://churn.example.com"

VALID_CUSTOMER = {
    "gender": "Female",
    "SeniorCitizen": 0,
    "Partner": "Yes",
    "Dependents": "No",
    "tenure": 1,
    "PhoneService": "No",
    "MultipleLines": "No phone service",
    "InternetService": "DSL",
    "OnlineSecurity": "No",
    "OnlineBackup": "Yes",
    "DeviceProtection": "No",
    "TechSupport": "No",
    "StreamingTV": "No",
    "StreamingMovies": "No",
    "Contract": "Month-to-month",
    "PaperlessBilling": "Yes",
    "PaymentMethod": "Electronic check",
    "MonthlyCharges": 29.85,
    "TotalCharges": 29.85,
}


@pytest.fixture(scope="session")
def client():
    from app.main import app

    # Using the client as a context manager runs the lifespan (model loading).
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def customer():
    return dict(VALID_CUSTOMER)
