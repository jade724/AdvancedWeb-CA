#!/bin/sh
set -e

echo "Starting Django setup..."

python manage.py migrate --noinput
python manage.py collectstatic --noinput

echo "Starting Gunicorn..."
PORT=${PORT:-8000}
exec gunicorn fuelsmart.wsgi:application --bind 0.0.0.0:$PORT
