# Finwave - Payout Management Platform

A comprehensive payout management platform built with FastAPI and React, featuring Stripe integration for secure payment processing. Finwave enables businesses to manage beneficiaries, process payouts, and track payment statuses with a modern, intuitive interface.

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** - For containerized development
- **Node.js 20+** - For frontend development (if running locally)
- **Python 3.11+** - For backend development (if running locally)
- **Stripe Account** - For payment processing (test mode supported)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd finwave
```

### 2. Environment Setup

Create a `.env` file in the `backend/` directory:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fintech

# Redis
REDIS_URL=redis://localhost:6379

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OAUTH_REDIRECT_URI=http://localhost:5173/api/v1/auth/callback

# Application Settings
ENV_NAME=dev
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 3. Start the Application

```bash
# Navigate to infrastructure directory
cd infra

# Start all services with Docker Compose
docker-compose up -d

# Or start with logs visible
docker-compose up
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432 (postgres/postgres)

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.11+
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: Google OAuth 2.0
- **Payments**: Stripe Connect integration
- **Caching**: Redis for session management
- **Migrations**: Alembic for database schema management

### Frontend (React + TypeScript)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context + Hooks
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Reverse Proxy**: Nginx (production)

## 🎯 Core Functionality

### 1. User Authentication
- **Google OAuth Integration** - Secure login with Google accounts
- **Session Management** - Redis-based session storage
- **Protected Routes** - Route-level authentication guards

### 2. Beneficiary Management
- **Create & Manage Beneficiaries** - Add individuals or businesses
- **Profile Information** - Name, email, country, type (individual/business)
- **Bulk Operations** - Import/export beneficiary data

### 3. Payment Destinations
- **Bank Account Support** - Traditional account number + routing
- **IBAN Support** - International bank account numbers
- **Card Support** - Debit/credit card payments
- **Multi-Currency** - Support for ZAR, GBP, USD, EUR

### 4. Payout Processing
- **Stripe Integration** - Secure payment processing via Stripe Connect
- **Connected Accounts** - Business account management
- **Real-time Status Tracking** - Pending, processing, paid, failed states
- **Idempotency** - Safe retry mechanisms for failed requests
- **Rate Limiting** - API protection against abuse

### 5. Dashboard & Analytics
- **Real-time Statistics** - Total payouts, success rates, amounts
- **Recent Activity** - Latest payout transactions
- **Account Overview** - Connected accounts and beneficiaries
- **Live Data** - All metrics calculated from real transaction data

### 6. Settings & Configuration
- **Profile Management** - User account settings
- **Connected Account Management** - Stripe account configuration
- **Currency Preferences** - Multi-currency support
- **Security Settings** - Session and security controls

## 📁 Project Structure

```
finwave/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/v1/routes/  # API endpoints
│   │   ├── core/           # Configuration & security
│   │   ├── db/             # Database models & migrations
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── integrations/   # External service integrations
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── features/       # Feature-specific modules
│   │   ├── lib/            # Utilities & API client
│   │   └── types/          # TypeScript type definitions
│   └── package.json        # Node.js dependencies
├── infra/                  # Infrastructure & deployment
│   ├── docker-compose.yml  # Docker services configuration
│   ├── api.Dockerfile      # Backend container
│   ├── web.Dockerfile      # Frontend container
│   └── stripe-setup.*      # Stripe CLI setup scripts
└── README.md              # This file
```

## 🔧 Development

### Backend Development

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Database Management

```bash
# Create new migration
cd backend
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 🔌 API Integration

### Authentication
All API requests require authentication via Google OAuth. The frontend automatically handles session management.

### Key Endpoints

- `POST /api/v1/payouts` - Create a new payout
- `GET /api/v1/payouts` - List user payouts
- `POST /api/v1/payouts/{id}/process` - Process a pending payout
- `GET /api/v1/beneficiaries` - List beneficiaries
- `POST /api/v1/beneficiaries` - Create beneficiary
- `GET /api/v1/connected-accounts` - List connected Stripe accounts

### Idempotency
Payout creation supports idempotency via the `Idempotency-Key` header to prevent duplicate transactions.

## 💳 Stripe Integration

### Setup
1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Configure webhook endpoints for payout status updates
4. Set up connected accounts for business payouts

### Supported Features
- **Stripe Connect** - Multi-party payment processing
- **Connected Accounts** - Business account management
- **Webhook Handling** - Real-time status updates
- **Multi-Currency** - ZAR, GBP, USD, EUR support
- **Test Mode** - Full testing environment

## 🚀 Deployment

### Production Deployment

1. **Environment Configuration**
   - Set production environment variables
   - Configure production database
   - Set up SSL certificates

2. **Docker Deployment**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Database Migration**
   ```bash
   docker-compose exec api alembic upgrade head
   ```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `OAUTH_REDIRECT_URI` | OAuth redirect URI | Yes |

## 📚 Documentation

- **API Documentation**: Available at `/docs` when running the backend
- **Database Schema**: See `backend/app/db/migrations/` for schema changes
- **Frontend Components**: Documented in `frontend/src/components/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/docs`
- Review the Stripe integration guide in `infra/STRIPE_SETUP.md`

## 🔄 Changelog

### v1.0.0
- Initial release with core payout functionality
- Google OAuth authentication
- Stripe Connect integration
- Multi-currency support (ZAR, GBP, USD, EUR)
- Real-time dashboard with live data
- Comprehensive beneficiary and destination management
- IBAN support for international payments
- Connected account management
- Settings and profile management

---

**Finwave** - Streamlining payout management for modern businesses 💸