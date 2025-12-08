# Base image
FROM python:3.11-slim

# Install system dependencies required by GeoDjango
RUN apt-get update && apt-get install -y \
    binutils \
    libproj-dev \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy and install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Expose app port
EXPOSE 8000

RUN python manage.py collectstatic --noinput

# Start Gunicorn server
CMD ["gunicorn", "fuelsmart.wsgi:application", "--bind", "0.0.0.0:8000"]

