FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev gcc postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Collect static *inside* the image
RUN python manage.py collectstatic --noinput

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
