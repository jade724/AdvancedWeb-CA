#!/bin/sh
set -e

python manage.py migrate --noinput

echo "Starting Gunicorn..."
exec gunicorn fuelsmart.wsgi:application --bind 0.0.0.0:$PORT
