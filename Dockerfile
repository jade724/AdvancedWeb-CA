FROM python:3.11-slim

# Install dependencies required
RUN apt-get update && apt-get install -y \
    netcat-openbsd \
    binutils libproj-dev gdal-bin postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Run Django via entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
