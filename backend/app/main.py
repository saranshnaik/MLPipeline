import os
from contextlib import asynccontextmanager

import pandas as pd
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.model_loader import load_model
from app.schemas import Customer, ModelInfo, Prediction


def get_allowed_origins() -> list[str]:
    """Comma-separated ALLOWED_ORIGINS env var; defaults to the local Next.js dev server."""
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
    return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail fast: if the model cannot be loaded the app does not start.
    app.state.model, app.state.model_info = load_model()
    yield


app = FastAPI(
    title="Telco Customer Churn API",
    description="API for predicting customer churn",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/")
def root():
    return {"message": "Telco Customer Churn API running"}


@app.get("/health")
def health(request: Request):
    return {
        "status": "healthy",
        "model_loaded": getattr(request.app.state, "model", None) is not None,
    }


@app.get("/model-info", response_model=ModelInfo)
def model_info(request: Request):
    return request.app.state.model_info


@app.post("/predict", response_model=Prediction)
def predict(customer: Customer, request: Request):
    model = request.app.state.model
    data = pd.DataFrame([customer.model_dump()])

    prediction = int(model.predict(data)[0])
    churn_probability = float(model.predict_proba(data)[0][1])

    return {
        "prediction": prediction,
        "churn": prediction == 1,
        "churn_probability": churn_probability,
    }
