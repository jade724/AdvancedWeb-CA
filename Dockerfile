FROM python:3.11-slim

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Make sure entrypoint.sh is executable
RUN chmod +x entrypoint.sh

# IMPORTANT: Ensure static files exist before collectstatic
# (Your static files are inside stations/static, so COPY . . above must include them)

# Expose port
EXPOSE 8000

# Entrypoint will run migrate + collectstatic + gunicorn
ENTRYPOINT ["./entrypoint.sh"]
