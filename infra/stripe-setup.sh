#!/bin/bash

# Stripe CLI Setup Script for Finwave
# This script helps you set up and manage Stripe CLI for webhook forwarding

set -e

case "${1:-help}" in
  "setup")
    echo "🔧 Setting up Stripe CLI..."
    echo ""
    echo "1. Add your Stripe secret key to your .env file:"
    echo "   STRIPE_SECRET_KEY=sk_test_..."
    echo ""
    echo "2. Authenticate with Stripe (run once):"
    echo "   ./stripe-setup.sh auth"
    echo ""
    echo "3. Start the development environment with Stripe CLI:"
    echo "   ./stripe-setup.sh start"
    echo ""
    echo "4. The Stripe CLI will forward webhooks to:"
    echo "   http://localhost:8000/api/v1/webhooks/stripe"
    echo ""
    echo "5. You can view webhook events in the Stripe CLI logs"
    ;;
  
  "auth")
    echo "🔐 Authenticating with Stripe..."
    echo "This will open a browser window for authentication."
    echo ""
    docker-compose --profile dev run --rm stripe-auth
    ;;
  
  "start")
    echo "🚀 Starting development environment with Stripe CLI..."
    docker-compose --profile dev up
    ;;
  
  "start-detached")
    echo "🚀 Starting development environment with Stripe CLI (detached)..."
    docker-compose --profile dev up -d
    echo "✅ Services started in background"
    echo "📋 View logs with: docker-compose logs -f stripe-cli"
    ;;
  
  "stop")
    echo "🛑 Stopping development environment..."
    docker-compose down
    ;;
  
  "logs")
    echo "📋 Viewing Stripe CLI logs..."
    docker-compose logs -f stripe-cli
    ;;
  
  "test-webhook")
    echo "🧪 Testing webhook endpoint..."
    echo "Sending test webhook to localhost:8000/api/v1/webhooks/stripe"
    curl -X POST http://localhost:8000/api/v1/webhooks/stripe \
      -H "Content-Type: application/json" \
      -H "Stripe-Signature: test" \
      -d '{"type": "test", "data": {"object": {"id": "test"}}}'
    echo ""
    ;;
  
  "help"|*)
    echo "Stripe CLI Management for Finwave"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup           - Show setup instructions"
    echo "  auth            - Authenticate with Stripe (run once)"
    echo "  start           - Start dev environment with Stripe CLI"
    echo "  start-detached  - Start dev environment in background"
    echo "  stop            - Stop all services"
    echo "  logs            - View Stripe CLI logs"
    echo "  test-webhook    - Test webhook endpoint"
    echo "  help            - Show this help"
    echo ""
    echo "Quick Start:"
    echo "  1. Run: $0 setup"
    echo "  2. Follow the setup instructions"
    echo "  3. Run: $0 start"
    ;;
esac

