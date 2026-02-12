FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy shared modules from parent directory
COPY ../../../shared /app/shared

# Expose port
EXPOSE 4004

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4004"]
