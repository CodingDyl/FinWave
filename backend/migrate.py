#!/usr/bin/env python3
"""
Database migration script for Finwave
This script ensures the database is ready and runs migrations.
"""

import time
import sys
import os
import psycopg2
from psycopg2 import OperationalError
import subprocess

def wait_for_database(max_retries=30, delay=2):
    """Wait for database to be ready"""
    print("🔄 Waiting for database to be ready...")
    
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(
                host=os.getenv("DB_HOST", "db"),
                port=int(os.getenv("DB_PORT", "5432")),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "postgres"),
                dbname=os.getenv("DB_NAME", "fintech")
            )
            conn.close()
            print("✅ Database is ready!")
            return True
        except OperationalError as e:
            print(f"⏳ Database not ready (attempt {attempt + 1}/{max_retries}): {e}")
            time.sleep(delay)
    
    print("❌ Database failed to become ready after maximum retries")
    return False

def run_migrations():
    """Run Alembic migrations"""
    print("🔄 Running database migrations...")
    
    try:
        # Change to backend directory
        os.chdir("/app/backend")
        
        # Run alembic upgrade
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            check=True
        )
        
        print("✅ Migrations completed successfully!")
        print("Migration output:")
        print(result.stdout)
        
        if result.stderr:
            print("Migration warnings:")
            print(result.stderr)
            
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Migration failed: {e}")
        print("Error output:")
        print(e.stderr)
        return False
    except Exception as e:
        print(f"❌ Unexpected error during migration: {e}")
        return False

def main():
    """Main migration process"""
    print("🚀 Starting Finwave database migration...")
    
    # Wait for database
    if not wait_for_database():
        sys.exit(1)
    
    # Run migrations
    if not run_migrations():
        sys.exit(1)
    
    print("🎉 Database migration completed successfully!")
    sys.exit(0)

if __name__ == "__main__":
    main()
