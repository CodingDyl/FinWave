# Stripe CLI Setup for Finwave

This guide helps you set up Stripe CLI for webhook forwarding during development.

## 🚀 Quick Start

### 1. Configure Environment

Add your Stripe secret key to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 2. Authenticate with Stripe (One-time setup)

**Windows (PowerShell):**
```powershell
cd infra
.\stripe-setup.ps1 auth
```

**Linux/Mac:**
```bash
cd infra
./stripe-setup.sh auth
```

This will open a browser window for authentication. You only need to do this once.

### 3. Start Development Environment

#### Option A: Using the setup script (Recommended)

**Windows (PowerShell):**
```powershell
cd infra
.\stripe-setup.ps1 setup    # Show setup instructions
.\stripe-setup.ps1 start    # Start with Stripe CLI
```

**Linux/Mac:**
```bash
cd infra
./stripe-setup.sh setup     # Show setup instructions
./stripe-setup.sh start     # Start with Stripe CLI
```

#### Option B: Using Docker Compose directly

```bash
cd infra
docker-compose --profile dev up
```

## 🔧 Available Commands

### Setup Script Commands

| Command | Description |
|---------|-------------|
| `setup` | Show detailed setup instructions |
| `auth` | Authenticate with Stripe (run once) |
| `start` | Start development environment with Stripe CLI |
| `start-detached` | Start in background mode |
| `stop` | Stop all services |
| `logs` | View Stripe CLI logs |
| `test-webhook` | Test webhook endpoint |

### Docker Compose Commands

| Command | Description |
|---------|-------------|
| `docker-compose --profile dev up` | Start with Stripe CLI |
| `docker-compose --profile dev up -d` | Start in background |
| `docker-compose logs -f stripe-cli` | View Stripe CLI logs |
| `docker-compose down` | Stop all services |

## 📡 Webhook Configuration

The Stripe CLI will forward webhooks to:
```
http://localhost:8000/api/v1/webhooks/stripe
```

### Webhook Events Handled

- `checkout.session.completed` - When a checkout session is completed
- `payment_intent.succeeded` - When a payment is successful  
- `payment_intent.payment_failed` - When a payment fails

## 🧪 Testing

### Test Webhook Endpoint

```bash
# Using the setup script
./stripe-setup.sh test-webhook

# Or using curl directly
curl -X POST http://localhost:8000/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{"type": "test", "data": {"object": {"id": "test"}}}'
```

### Test with Stripe CLI

```bash
# Trigger a test webhook
stripe trigger checkout.session.completed

# Listen to webhook events
stripe listen --forward-to http://localhost:8000/api/v1/webhooks/stripe
```

## 🔍 Troubleshooting

### Common Issues

1. **"Webhook secret not configured"**
   - Make sure `STRIPE_WEBHOOK_SECRET` is set in your `.env` file

2. **"Invalid signature"**
   - The Stripe CLI should handle signature verification automatically
   - Check that the webhook endpoint URL is correct

3. **"Connection refused"**
   - Make sure the API service is running on port 8000
   - Check that the webhook endpoint exists: `/api/v1/webhooks/stripe`

### Viewing Logs

```bash
# View all logs
docker-compose logs

# View only Stripe CLI logs
docker-compose logs -f stripe-cli

# View only API logs
docker-compose logs -f api
```

## 📚 Additional Resources

- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Docker Compose Profiles](https://docs.docker.com/compose/profiles/)

## 🎯 Production Setup

For production, you'll need to:

1. Set up a proper webhook endpoint URL (not localhost)
2. Configure webhook secrets in your Stripe dashboard
3. Use HTTPS for webhook endpoints
4. Implement proper error handling and retry logic

The current setup is designed for development and testing only.
