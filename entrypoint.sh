#!/bin/sh

echo "Waiting for PostgreSQL..."

# Wait for DB
while ! nc -z $POSTGRES_HOST $POSTGRES_PORT; do
  sleep 1
done

echo "PostgreSQL started!"

# Run migrations
python manage.py migrate --noinput

# Start server
gunicorn fuelsmart.wsgi:application --bind 0.0.0.0:8000
