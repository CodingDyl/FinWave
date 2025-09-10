## API Examples & HTTP Snippets

We ship OpenAPI examples on request/response models, plus ready-to-run `.http` files for VS Code’s REST Client.

- Open Swagger UI: `http://localhost:8000/docs`
- Example code samples appear inside each operation (curl tab).

### Quickstart with .http

1. Install **REST Client** in VS Code.
2. Open `backend/http/_env.http` and set:
   - `@baseUrl` (usually `http://localhost:8000`)
   - `@sessionCookie` after logging in (copy the `session=...` cookie)
   - `@webhookSignature` and `@webhookTimestamp` (see *Webhook Verification* below)
3. Open `backend/http/payouts.http` and click **Send Request**.

## Idempotency

`POST /api/v1/payouts` supports idempotency via the `Idempotency-Key` header.

- **Same key + same payload** ➜ returns the **same payout** (no duplicate).
- **Same key + different payload** ➜ HTTP **409 conflict**.
- Idempotency keys are stored with the resulting record to ensure safe retries.

## Rate Limiting

The payouts endpoint is rate-limited. If you exceed the burst/interval caps you’ll get **429 Too Many Requests** with an error body like:

```json
{ "error": { "code": "rate_limited", "message": "Too many requests." } }
