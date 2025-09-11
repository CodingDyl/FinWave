# Migration Instructions

## Database Migration

To apply the new beneficiaries and destinations tables, run:

```bash
cd backend
alembic upgrade head
```

This will:
- Create `beneficiaries` table with user relationships
- Create `payout_destinations` table with beneficiary relationships  
- Update `payout_requests` table to reference beneficiaries and destinations
- Add proper foreign key constraints and indexes

## API Changes

### New Endpoints

- `POST /api/v1/beneficiaries` - Create beneficiary
- `GET /api/v1/beneficiaries` - List user's beneficiaries
- `POST /api/v1/beneficiaries/{id}/destinations` - Create bank destination
- `GET /api/v1/beneficiaries/{id}/destinations` - List beneficiary's destinations

### Updated Endpoints

- `POST /api/v1/payouts` - Now requires `beneficiary_id` and `destination_id`
- `GET /api/v1/payouts` - Returns nested beneficiary and destination data

### New Request/Response Format

**PayoutCreate:**
```json
{
  "beneficiary_id": "uuid",
  "destination_id": "uuid", 
  "amount": 10000,
  "currency": "USD",
  "memo": "Optional memo"
}
```

**PayoutOut:**
```json
{
  "id": "uuid",
  "status": "pending",
  "amount": 10000,
  "currency": "USD",
  "beneficiary": {
    "id": "uuid",
    "name": "John Doe",
    "type": "individual",
    "country": "US"
  },
  "destination": {
    "id": "uuid",
    "label": "Chase ••••6789",
    "last4": "6789",
    "currency": "USD",
    "status": "verified"
  },
  "memo": "Payment for services",
  "created_at": "2025-01-10T22:30:00Z",
  "idempotency_key": "uuid"
}
```

## Frontend Changes

- Updated `CreatePayoutModal` to use beneficiary and destination selection
- Added `BeneficiarySelect` and `DestinationSelect` components
- Updated payouts table to display beneficiary and destination information
- Enhanced search to include beneficiary and destination fields
- Updated CSV export to include new columns

## Security

- All endpoints require authentication
- Users can only access their own beneficiaries and destinations
- Beneficiaries and destinations are properly scoped to users
