# HTTP Files for Finwave API

This directory contains HTTP files for testing all API endpoints in the Finwave application. These files can be used with HTTP clients like VS Code REST Client, IntelliJ HTTP Client, or Postman.

## Files Overview

### Core API Endpoints
- **`auth.http`** - Authentication and user management
- **`beneficiaries.http`** - Beneficiary management
- **`destinations.http`** - Bank account destinations
- **`payouts.http`** - Payout creation and management
- **`connected-accounts.http`** - Stripe Connect account management
- **`stripe.http`** - Stripe payment processing
- **`stripe-dev.http`** - Stripe development/testing endpoints
- **`webhooks.http`** - Webhook handling
- **`health.http`** - System health checks

### Environment Variables

Set these variables in your HTTP client or replace them manually

## Usage Instructions

### 1. Authentication Flow
1. Start with `auth.http` - call the login endpoint
2. Copy the session cookie from the response
3. Use the session cookie in subsequent requests

### 2. Complete Payout Flow
1. **Create Beneficiary** (`beneficiaries.http`)
2. **Add Bank Account** (`destinations.http`)
3. **Create Payout** (`payouts.http`)
4. **Process Payout** (`payouts.http`)

### 3. Stripe Connect Flow
1. **Create Connected Account** (`connected-accounts.http`)
2. **Add Bank Account** (`connected-accounts.http`)
3. **Set as Default** (`connected-accounts.http`)
4. **Test Payouts** (`stripe-dev.http`)

## Testing Tips

### Idempotency Testing
- Use the same `Idempotency-Key` header multiple times
- Verify that duplicate requests return the same result
- Test with different keys to ensure new records are created

### Error Testing
- Test with invalid data to verify error handling
- Test with missing required fields
- Test with invalid authentication

### Webhook Testing
- Use Stripe CLI to forward webhooks: `stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe`
- Test with different event types
- Verify signature validation

## Development vs Production

- **Development endpoints** (`stripe-dev.http`) are only available when `ENV_NAME=dev`
- **Production endpoints** should use proper authentication and validation
- **Test data** should be used for development endpoints only

## Security Notes

- Never commit real API keys or session cookies
- Use environment variables for sensitive data
- Test webhook signatures in development
- Validate all input data before processing

## Troubleshooting

### Common Issues
1. **401 Unauthorized**: Check session cookie
2. **422 Validation Error**: Verify request body format
3. **500 Internal Error**: Check server logs
4. **Webhook Signature Invalid**: Verify signature calculation

### Debug Steps
1. Check server logs for detailed error messages
2. Verify environment variables are set correctly
3. Test with minimal request bodies first
4. Use health check endpoint to verify server status
