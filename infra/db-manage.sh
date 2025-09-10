#!/bin/bash

# Database management script for Finwave
# Usage: ./db-manage.sh [command]
# Commands: reset, migrate, status, shell

set -e

case "${1:-help}" in
  "reset")
    echo "🗑️  Resetting database..."
    docker-compose down -v
    docker-compose up -d db
    echo "⏳ Waiting for database to be ready..."
    until docker-compose exec db pg_isready -U postgres -d fintech; do
      echo "Database is unavailable - sleeping"
      sleep 2
    done
    echo "✅ Database is ready!"
    ;;
  
  "migrate")
    echo "🔄 Running migrations..."
    docker-compose run --rm migrate
    echo "✅ Migrations completed!"
    ;;
  
  "status")
    echo "📊 Database status:"
    docker-compose exec db psql -U postgres -d fintech -c '\dt'
    ;;
  
  "shell")
    echo "🐚 Opening database shell..."
    docker-compose exec db psql -U postgres -d fintech
    ;;
  
  "logs")
    echo "📋 Database logs:"
    docker-compose logs db
    ;;
  
  "help"|*)
    echo "Finwave Database Management"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  reset    - Reset database (delete all data and recreate)"
    echo "  migrate  - Run database migrations"
    echo "  status   - Show database tables"
    echo "  shell    - Open database shell"
    echo "  logs     - Show database logs"
    echo "  help     - Show this help"
    ;;
esac
