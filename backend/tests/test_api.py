import pytest


def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "running" in response.json()["message"]


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["model_loaded"] is True


def test_model_info(client):
    response = client.get("/model-info")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"source", "name", "version", "run_id", "uri"}
    assert body["source"] == "local"
    assert body["name"] == "model"


def test_prediction(client, customer):
    response = client.post("/predict", json=customer)

    assert response.status_code == 200

    result = response.json()
    assert result["prediction"] in [0, 1]
    assert isinstance(result["churn"], bool)
    assert 0 <= result["churn_probability"] <= 1


def test_prediction_is_deterministic_and_plausible(client, customer):
    first = client.post("/predict", json=customer).json()
    second = client.post("/predict", json=customer).json()
    assert first == second
    # New month-to-month customer on electronic check is a high churn risk.
    assert first["churn_probability"] > 0.5


def test_long_contract_lowers_churn_probability(client, customer):
    monthly = client.post("/predict", json=customer).json()["churn_probability"]
    customer.update({"Contract": "Two year", "tenure": 60, "TotalCharges": 1800.0})
    long_term = client.post("/predict", json=customer).json()["churn_probability"]
    assert long_term < monthly


def test_invalid_request(client):
    response = client.post("/predict", json={})
    assert response.status_code == 422


@pytest.mark.parametrize(
    "override",
    [
        {"Contract": "month-to-month"},  # wrong casing: previously a silent wrong prediction
        {"Contract": "Three year"},
        {"PaymentMethod": "Bitcoin"},
        {"gender": "Other"},
        {"InternetService": "Satellite"},
        {"OnlineSecurity": "Maybe"},
        {"tenure": -1},
        {"tenure": 121},
        {"tenure": 1.5},
        {"SeniorCitizen": 2},
        {"SeniorCitizen": -1},
        {"MonthlyCharges": -0.01},
        {"TotalCharges": 100_001},
        {"MonthlyCharges": "abc"},
    ],
)
def test_invalid_values_are_rejected(client, customer, override):
    customer.update(override)
    response = client.post("/predict", json=customer)
    assert response.status_code == 422


def test_unknown_field_is_rejected(client, customer):
    customer["extra_field"] = "x"
    response = client.post("/predict", json=customer)
    assert response.status_code == 422


def test_missing_field_is_rejected(client, customer):
    del customer["tenure"]
    response = client.post("/predict", json=customer)
    assert response.status_code == 422


def test_cors_allows_configured_origin(client):
    response = client.options(
        "/predict",
        headers={
            "Origin": "https://churn.example.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://churn.example.com"
    assert "access-control-allow-credentials" not in response.headers


def test_cors_blocks_other_origin(client):
    response = client.options(
        "/predict",
        headers={
            "Origin": "https://evil.example.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
