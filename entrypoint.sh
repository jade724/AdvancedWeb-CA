#!/bin/sh
set -e

echo "Waiting for database..."

# Wait for PostgreSQL to be ready
while ! nc -z $POSTGRES_HOST $POSTGRES_PORT; do
  sleep 1
done

echo "Database is ready!"
echo "Starting Django setup..."

# TEMP FIX FOR BROKEN RENDER MIGRATIONS (REMOVE AFTER SUCCESSFUL DEPLOY)
python manage.py migrate stations zero --fake || true
python manage.py migrate stations --fake-initial || true

# Run all normal migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

echo "Starting Gunicorn..."

# Render sets $PORT automatically. Fall back to 8000 for local use.
PORT=${PORT:-8000}

exec gunicorn fuelsmart.wsgi:application --bind 0.0.0.0:$PORT
