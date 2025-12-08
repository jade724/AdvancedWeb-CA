#!/bin/sh
set -e

echo "Starting Django setup..."

# Run migrations (will just say 'No migrations to apply' if already done)
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

echo "Starting Gunicorn..."

# Render sets $PORT automatically. Fall back to 8000 for local/Docker use.
PORT=${PORT:-8000}

exec gunicorn fuelsmart.wsgi:application --bind 0.0.0.0:$PORT
