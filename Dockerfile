FROM python:3.11-slim

WORKDIR /app

# Install Poetry
RUN pip install poetry

# Copy source code and dependency files
COPY pyproject.toml poetry.lock ./
COPY src/ ./src/
COPY .env ./

# Install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --only main --no-interaction --no-ansi

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["poetry", "run", "python", "-m", "src.main"] 