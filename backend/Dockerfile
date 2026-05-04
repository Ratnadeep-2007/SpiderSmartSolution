FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose the port that the app runs on. 
# Hugging Face Spaces uses 7860 by default, but we can use 8000.
# We will use the $PORT environment variable if available, else 8000.
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
