# Use Python base image
FROM python:3.11-slim

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project into the container
COPY . .

# Ensure entrypoint is executable
RUN chmod +x entrypoint.sh

# Collect static assets during build (optional but OK)
# RUN python manage.py collectstatic --noinput

# Expose port used by Render
EXPOSE 8000

# Use entrypoint to run migrations, collect static, and start Gunicorn
ENTRYPOINT ["./entrypoint.sh"]
