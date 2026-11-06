FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code only. The model is NOT baked into the image: it is loaded at startup
# from the MLflow Model Registry (MODEL_URI, MLFLOW_TRACKING_* env vars).
COPY app/ ./app/

# Document the API port (Render and similar hosts inject PORT)
EXPOSE 8000

# Shell form so ${PORT} is expanded; exec so uvicorn receives SIGTERM directly.
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
