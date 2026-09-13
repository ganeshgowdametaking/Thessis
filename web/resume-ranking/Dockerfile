FROM python:3.10-slim-bookworm

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=100 \
    --trusted-host pypi.org \
    --trusted-host files.pythonhosted.org \
    -r requirements.txt

COPY . .

# Cloud Run injects PORT (usually 8080) and requires the container to listen
# on it; shell form so ${PORT} expands at runtime. Falls back to 8000 to
# match the README's local `uvicorn` command when PORT isn't set.
ENV PORT=8000
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
