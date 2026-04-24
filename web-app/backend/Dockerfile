FROM python:3.11-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# /data is the Render persistent disk mount point
# STORAGE_DIR and DB_PATH are set via render.yaml env vars
EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
