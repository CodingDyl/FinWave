#!/bin/bash

# Stripe CLI Authentication with Timeout
# This script handles Stripe authentication with proper timeout and logging

set -e

echo "🔐 Starting Stripe CLI authentication with timeout handling..."
echo ""

# Set timeout (5 minutes)
TIMEOUT=300
TIMEOUT_CMD="timeout $TIMEOUT"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🧹 Cleaning up authentication process..."
    docker-compose --profile dev stop stripe-auth 2>/dev/null || true
    docker-compose --profile dev rm -f stripe-auth 2>/dev/null || true
}

# Set trap to cleanup on script exit
trap cleanup EXIT

echo "⏱️  Authentication timeout set to $TIMEOUT seconds (5 minutes)"
echo ""

# Start authentication container
echo "🚀 Starting Stripe authentication container..."
docker-compose --profile dev run --rm stripe-auth &
AUTH_PID=$!

# Wait for authentication with timeout
echo "⏳ Waiting for authentication to complete..."
echo "   - Check your browser for the authentication page"
echo "   - Enter the pairing code when prompted"
echo "   - This will timeout after $TIMEOUT seconds"
echo ""

# Monitor the authentication process
if wait $AUTH_PID; then
    echo ""
    echo "✅ Stripe authentication completed successfully!"
    echo ""
    echo "🚀 Starting Stripe CLI webhook listener..."
    docker-compose --profile dev up -d stripe-cli
    
    echo "📋 Monitoring Stripe CLI logs (press Ctrl+C to stop):"
    docker-compose logs -f stripe-cli
else
    echo ""
    echo "❌ Authentication failed or timed out after $TIMEOUT seconds"
    echo ""
    echo "🔧 Troubleshooting steps:"
    echo "   1. Check your internet connection"
    echo "   2. Make sure you can access https://dashboard.stripe.com"
    echo "   3. Try running: docker-compose --profile dev run --rm stripe-auth"
    echo "   4. Check if you have a valid Stripe account"
    echo ""
    exit 1
fi
