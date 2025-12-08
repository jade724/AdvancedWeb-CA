#!/bin/sh
set -e

echo "Waiting for database..."

while ! nc -z $POSTGRES_HOST $POSTGRES_PORT; do
  sleep 1
done

echo "Database is ready!"

python manage.py migrate --noinput

python manage.py collectstatic --noinput

exec gunicorn fuelsmart.wsgi:application --bind 0.0.0.0:8000
