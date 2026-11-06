"""Request/response schemas.

Categorical fields are restricted to the exact categories the model was trained on
(see backend/training/train.py). The model's OneHotEncoder uses handle_unknown="ignore",
so an unexpected value such as "month-to-month" would otherwise be silently encoded as
all zeros and produce a wrong prediction instead of an error.
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

YesNo = Literal["Yes", "No"]
YesNoNoInternet = Literal["Yes", "No", "No internet service"]


class Customer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gender: Literal["Female", "Male"]
    SeniorCitizen: Literal[0, 1]
    Partner: YesNo
    Dependents: YesNo
    tenure: int = Field(ge=0, le=120)
    PhoneService: YesNo
    MultipleLines: Literal["Yes", "No", "No phone service"]
    InternetService: Literal["DSL", "Fiber optic", "No"]
    OnlineSecurity: YesNoNoInternet
    OnlineBackup: YesNoNoInternet
    DeviceProtection: YesNoNoInternet
    TechSupport: YesNoNoInternet
    StreamingTV: YesNoNoInternet
    StreamingMovies: YesNoNoInternet
    Contract: Literal["Month-to-month", "One year", "Two year"]
    PaperlessBilling: YesNo
    PaymentMethod: Literal[
        "Electronic check",
        "Mailed check",
        "Bank transfer (automatic)",
        "Credit card (automatic)",
    ]
    MonthlyCharges: float = Field(ge=0, le=100_000)
    TotalCharges: float = Field(ge=0, le=100_000)


class Prediction(BaseModel):
    prediction: int
    churn: bool
    churn_probability: float


class ModelInfo(BaseModel):
    source: Literal["registry", "local"]
    name: str
    version: str | None
    run_id: str | None
    uri: str
