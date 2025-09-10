#!/bin/bash
set -e

echo "🚀 Starting Finwave API..."

# Wait for database to be ready (backup check)
echo "🔄 Checking database connection..."
until python -c "import psycopg2; psycopg2.connect(host='db', port=5432, user='postgres', password='postgres', dbname='fintech')" 2>/dev/null; do
  echo "⏳ Database not ready, waiting..."
  sleep 2
done

echo "✅ Database is ready!"

# Run migrations as a backup (in case migrate service failed)
echo "🔄 Running migrations as backup..."
alembic upgrade head

echo "✅ Migrations completed!"

# Start the API server
echo "🚀 Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
