# Telco Customer Churn Predictor

## About

An end-to-end machine learning pipeline that:

* trains a customer churn model from a reproducible script
* tracks every experiment (parameters, metrics, artifacts) in MLflow
* registers models in the MLflow Model Registry
* promotes the best model with a `champion` alias
* serves the champion model through a validated FastAPI service
* shows predictions in a Next.js dashboard
* deploys on a completely free stack

The system is built around the Telco Customer Churn dataset (7,043 customers, 19 input features) and uses a scikit-learn pipeline with a logistic regression classifier. The API loads its model from the registry at startup, so shipping a new model does not require rebuilding the image.

---

## Features

### ML Pipeline

```text
Telco churn CSV (Kaggle)
        ↓
Training script (train.py)
        ↓
MLflow run (params, metrics, artifacts)
        ↓
Model Registry (telco-churn)
        ↓
Promotion check (ROC-AUC vs current champion)
        ↓
@champion alias
        ↓
FastAPI loads models:/telco-churn@champion at startup
        ↓
POST /predict
        ↓
Next.js dashboard
```

---

## Current Capabilities

### Training & Experiment Tracking

* Reproducible training script converted from the original notebook
* Identical preprocessing and split as the notebook (80/20 stratified, seed 80)
* Parameters, metrics and artifacts logged to MLflow
* Confusion matrix and classification report saved with every run
* Model signature and input example logged with every model
* Automatic comparison against the current champion
* Optional Render deploy hook after promotion

### Model Registry

* Models registered as `telco-churn`
* `@champion` alias marks the production version
* Promotion only when test ROC-AUC improves (or forced with `--promote`)
* Safe `skops` model serialization instead of pickle

### Prediction API

* `POST /predict` returns class, churn flag and churn probability
* `GET /model-info` returns the live model name, version and run id
* `GET /health` reports service and model status
* Strict input validation using the exact categories the model was trained on
* Numeric range checks and rejection of unknown fields
* Fail-fast startup if the model cannot be loaded
* CORS origins configured through environment variables

### Dashboard

* Customer details form with dropdowns for every categorical field
* Churn prediction and probability display
* API status badge (connecting, online, unreachable)
* Server wake-up on page load for sleeping free-tier hosts
* Slow-start notice when the first request takes longer than 5 seconds
* Live model version shown in the footer

### Quality & Delivery

* 37 backend tests that run fully offline
* GitHub Actions CI for backend tests, frontend lint and production build
* Docker image that does not contain the model or any secrets
* Render blueprint for one-click backend deployment

---

## Model Results

Evaluated on the 1,409-customer hold-out set:

| Metric    | Value  |
| --------- | ------ |
| Accuracy  | 0.8119 |
| Precision | 0.6764 |
| Recall    | 0.5588 |
| F1 Score  | 0.6120 |
| ROC-AUC   | 0.8537 |

---

## Tech Stack

### Backend

* FastAPI
* Python 3.11
* Pydantic
* scikit-learn 1.6.1
* pandas
* MLflow (`mlflow-skinny` at serving time)
* skops
* pytest
* Docker

### Frontend

* Next.js 16
* React 19
* TypeScript
* TailwindCSS 4

### Infrastructure (all free tier)

* DagsHub (hosted MLflow tracking server and model registry)
* Render (API hosting)
* Vercel (frontend hosting)
* GitHub Actions (CI)

---

## Running the Project

### Prerequisites

Required

* Python 3.11
* Node.js 22 or newer
* npm

Optional

* Docker Desktop (to run the production image locally)

---

### Environment Setup

Copy

`backend/.env.example`

to

`backend/.env` (git-ignored)

and fill in the values. The required variables are

```text
MLFLOW_TRACKING_URI=https://dagshub.com/<username>/<repo>.mlflow
MLFLOW_TRACKING_USERNAME=<your DagsHub username>
MLFLOW_TRACKING_PASSWORD=<your DagsHub access token>
```

Optional

```text
MODEL_URI=models:/telco-churn@champion
ALLOWED_ORIGINS=http://localhost:3000
RENDER_DEPLOY_HOOK_URL=<Render deploy hook, used by train.py after promotion>
```

Create `frontend/.env.local`:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

### DagsHub Setup

#### 1. Create A DagsHub Repository

Connect or mirror this GitHub repository. DagsHub automatically provides an MLflow server at `https://dagshub.com/<username>/<repo>.mlflow`.

#### 2. Create An Access Token

Create a token in your DagsHub account settings. Use your DagsHub username as `MLFLOW_TRACKING_USERNAME` and the token as `MLFLOW_TRACKING_PASSWORD`.

#### 3. Train The First Model

Follow the training steps below. The first run registers `telco-churn` version 1 and sets the `champion` alias automatically.

---

### Training

#### 1. Download the dataset

Download `WA_Fn-UseC_-Telco-Customer-Churn.csv` from [Kaggle](https://www.kaggle.com/datasets/blastchar/telco-customer-churn) and place it in `backend/training/data/`.

#### 2. Create the training environment

```bash
cd backend
python -m venv training/.venv
training/.venv/Scripts/python -m pip install -r training/requirements.txt
```

On macOS or Linux use `training/.venv/bin/python` instead of `training/.venv/Scripts/python`.

#### 3. Train

```bash
training/.venv/Scripts/python training/train.py
```

Useful options

```bash
training/.venv/Scripts/python training/train.py --promote   # force the new version to @champion
training/.venv/Scripts/python training/train.py --C 0.5     # try another regularization strength
```

---

### Backend Setup

In a new terminal

#### 1. Navigate to backend

```bash
cd backend
```

#### 2. Create a virtual environment and install dependencies

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt
```

#### 3. Start the API

Using the local pickle (no network needed)

```bash
.venv/Scripts/python -m uvicorn app.main:app --reload
```

Using the registry champion model

```bash
MODEL_URI=models:/telco-churn@champion .venv/Scripts/python -m uvicorn app.main:app --env-file .env
```

In PowerShell, set the variable first: `$env:MODEL_URI = "models:/telco-churn@champion"`.

* Backend API: `http://localhost:8000`
* Swagger Docs: `http://localhost:8000/docs`

#### 4. Run the tests

```bash
.venv/Scripts/python -m pytest
```

Tests always use the local pickle and never contact MLflow.

---

### Frontend Setup

In a new terminal

#### 1. Navigate to frontend

```bash
cd frontend
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Start development server

```bash
npm run dev
```

* Frontend: `http://localhost:3000`

---

### Docker (Optional)

Build and run the production image against the registry

```bash
docker build -t telco-churn-api backend
docker run --rm -p 8000:8000 --env-file backend/.env \
  -e MODEL_URI=models:/telco-churn@champion telco-churn-api
```

The image contains only the application code. The model is downloaded from the registry when the container starts, and `.env` is never copied into the image.

---

## API Reference

| Method | Endpoint      | Description                                       |
| ------ | ------------- | ------------------------------------------------- |
| GET    | `/`           | Service banner                                    |
| GET    | `/health`     | Service status and `model_loaded` flag            |
| GET    | `/model-info` | Model source, name, version, run id and URI       |
| POST   | `/predict`    | Churn prediction for one customer                 |

Example

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "Female", "SeniorCitizen": 0, "Partner": "Yes", "Dependents": "No",
    "tenure": 1, "PhoneService": "No", "MultipleLines": "No phone service",
    "InternetService": "DSL", "OnlineSecurity": "No", "OnlineBackup": "Yes",
    "DeviceProtection": "No", "TechSupport": "No", "StreamingTV": "No",
    "StreamingMovies": "No", "Contract": "Month-to-month", "PaperlessBilling": "Yes",
    "PaymentMethod": "Electronic check", "MonthlyCharges": 29.85, "TotalCharges": 29.85
  }'
```

Response

```json
{
  "prediction": 1,
  "churn": true,
  "churn_probability": 0.6475
}
```

Invalid values (for example `"month-to-month"` instead of `"Month-to-month"`) return HTTP 422.

---

## Deployment

### 1. Backend on Render

* Create a Render account and choose **New → Blueprint**
* Select this repository (Render reads `render.yaml`)
* Set `MLFLOW_TRACKING_USERNAME`, `MLFLOW_TRACKING_PASSWORD` (use a dedicated DagsHub token) and `ALLOWED_ORIGINS` in the dashboard
* Check `https://<service>.onrender.com/model-info`

### 2. Frontend on Vercel

* Import this repository
* Set **Root Directory** to `frontend`
* Set `NEXT_PUBLIC_API_URL` to the Render service URL (no trailing slash)

### 3. Connect Them

Set `ALLOWED_ORIGINS` on Render to the Vercel URL, for example `https://your-app.vercel.app,http://localhost:3000`.

### Releasing A New Model

Run `train.py`. If the new version has a higher ROC-AUC it becomes `@champion`. Restart the Render service (or trigger its deploy hook) so the API loads it.

---

## Project Structure

```text
backend/
│
├── app/
│   ├── main.py            # FastAPI application, lifespan model loading, endpoints
│   ├── model_loader.py    # Loads from the MLflow registry or a local pickle
│   └── schemas.py         # Request and response models with strict validation
├── model/                 # Local model pickle (test fixture and offline fallback)
├── tests/                 # Offline API and loader tests
├── training/
│   ├── notebooks/         # Original training notebook
│   ├── data/              # Dataset (git-ignored)
│   ├── train.py           # Training, MLflow tracking, registration, promotion
│   └── requirements.txt   # Pinned training dependencies
│
├── .dockerignore          # Files excluded from the Docker build
├── Dockerfile             # Production image (no model, no secrets)
├── pytest.ini             # Test configuration
├── requirements.txt       # Runtime dependencies
└── requirements-dev.txt   # Runtime + test dependencies


frontend/
│
├── app/
│   ├── layout.tsx         # Root layout and metadata
│   ├── page.tsx           # Prediction dashboard
│   └── globals.css        # Global styles
├── public/                # Static assets
│
├── package.json           # Frontend dependencies
└── other-configuration-files
...


.github/workflows/ci.yml   # Backend tests, frontend lint and build
render.yaml                # Render blueprint for the API
```

---

## Backend Highlights

* **Model Loader** — Resolves `models:/name@alias` to an exact version, loads it, and records the version and run id for `/model-info`.
* **Validation** — Categorical fields are restricted to the categories seen in training, because the model's encoder would otherwise silently ignore unknown values and return a wrong prediction.
* **Training** — One script handles tracking, registration and promotion, and reproduces the original notebook's model exactly.
* **Security** — No secrets in the image or the repository, safe model serialization, and configurable CORS.

---

## Frontend Highlights

* **Next.js App Router** architecture.
* **Free-tier friendly** — wakes the API on load and explains slow first requests.
* **Live model version** fetched from the API.
* **Accessible status messages** for connection state, errors and results.

---

## Model & Registry

Preprocessing and model

* Numeric features (`SeniorCitizen`, `tenure`, `MonthlyCharges`, `TotalCharges`): median imputation and standard scaling
* Categorical features (15 columns): most-frequent imputation and one-hot encoding
* Classifier: Logistic Regression (`max_iter=1000`, `random_state=80`)

Registry

* Registered model: `telco-churn`
* Production alias: `champion`
* Hosted on DagsHub's free MLflow server

---

## Deployment Architecture

```text
GitHub (main)
├── GitHub Actions   (tests, lint, build)
├── Render           (FastAPI container, loads champion at startup)
├── Vercel           (Next.js frontend)
└── DagsHub          (MLflow tracking server and model registry)
```

---

## Configuration

| Variable                   | Where            | Purpose                                              |
| -------------------------- | ---------------- | ---------------------------------------------------- |
| `MODEL_URI`                | backend          | `models:/telco-churn@champion`, a version, or a path |
| `MLFLOW_TRACKING_URI`      | backend, trainer | MLflow server address                                |
| `MLFLOW_TRACKING_USERNAME` | backend, trainer | DagsHub username                                     |
| `MLFLOW_TRACKING_PASSWORD` | backend, trainer | DagsHub access token                                 |
| `ALLOWED_ORIGINS`          | backend          | Comma-separated browser origins allowed by CORS      |
| `RENDER_DEPLOY_HOOK_URL`   | trainer          | Optional: restart the API after promotion            |
| `NEXT_PUBLIC_API_URL`      | frontend         | Base URL of the API                                  |

---

## Current Limitations

* No authentication or rate limiting on the API
* Free-tier cold starts of roughly 30 to 60 seconds after 15 minutes of inactivity
* A newly promoted model goes live only after the API restarts
* No prediction logging, drift monitoring or scheduled retraining
* Single model family (logistic regression) with no hyperparameter search
* No frontend tests

## Author

**Saransh**
