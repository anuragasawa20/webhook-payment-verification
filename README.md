# Webhook Payment Verification System

## Project Overview
A secure webhook endpoint system for processing and validating payment transactions with HMAC signature verification and database persistence.

## Tech Stack
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (NeonDB)
- **ORM**: TypeORM
- **Validation**: express-validator
- **Logging**: Winston

## Prerequisites
- Node.js version 18 or higher
- PostgreSQL database (NeonDB or local)
- npm or yarn package manager

## Setup Instructions

### 1. Clone the repository
```bash
git clone <repository-url>
cd webhook-payment-verification
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root directory:
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Webhook Security
WEBHOOK_SECRET=your-secret-key-here
```

### 4. Setup database
Run the migration script to create tables:
```bash
psql -h <host> -U <user> -d <database> -f migrations/001_initial_schema.sql
```

Or use TypeORM synchronization (development only):
```bash
npm run dev
```

## How to Run the Application

### Development mode (with auto-reload)
```bash
npm run dev
```

### Production mode
```bash
npm run build
npm start
```

Server will start on `http://localhost:3000`

## How to Test the Webhook Endpoint

### Method 1: Generate Test via API (Easiest) ⭐
```bash
# Step 1: Generate signature and curl command
curl http://localhost:3000/webhooks/generate-test

# Step 2: Copy the "curl" field from response and run it
# The response contains ready-to-use curl command with valid signature
```

**Using in Browser:**
1. Visit: `http://localhost:3000/webhooks/generate-test`
2. Copy the `curl` command from the response
3. Paste in terminal and press Enter

**Custom base URL:**
```bash
curl "http://localhost:3000/webhooks/generate-test?baseUrl=https://your-domain.com"
```

### Method 2: Using the test script
```bash
node test-signature-generator.js
```

### Method 3: Manual testing with curl
```bash
curl -X POST http://localhost:3000/webhooks/payment \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <generated-signature>" \
  -H "X-Webhook-Timestamp: <timestamp>" \
  -d '{
    "event_id": "evt_123",
    "event_type": "transaction.completed",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "transaction_id": "txn_456",
      "amount": 100.50,
      "currency": "USD",
      "sender": {
        "id": "user_789",
        "name": "John Doe",
        "country": "US"
      },
      "receiver": {
        "id": "user_101",
        "name": "Jane Smith",
        "country": "CA"
      },
      "status": "completed",
      "payment_method": "credit_card"
    }
  }'
```

### Health check
```bash
curl http://localhost:3000/webhooks/health
```

### Results 

![Result of first time transaction process](image-1.png)
![Checking the Idempotency](image.png)


## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3000 |
| `NODE_ENV` | Environment (development/production) | No | development |
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `WEBHOOK_SECRET` | Secret key for HMAC signature | Yes | - |

## Database Migration/Setup Scripts

### Initial Setup - Run First Time:
```bash
# Apply the initial schema
psql $DATABASE_URL -f migrations/001_initial_schema.sql
```

### Making Schema Changes:

**1. Modify Entity:**
```typescript
// Edit src/entities/Transaction.entity.ts
@Column({ nullable: true })
newField: string;  // Add new field
```

**2. Generate Migration:**
```bash
npm run migration:generate -- src/migrations/DescriptiveName
```

**3. Review Generated File:**
Check `src/migrations/[timestamp]-DescriptiveName.ts`

**4. Apply Migration:**
```bash
npm run migration:run
```

**5. Rollback if Needed:**
```bash
npm run migration:revert
```

### Migration Commands:
```bash
# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Generate migration from entity changes
npm run migration:generate -- src/migrations/MigrationName
```

## API Endpoints

### POST /webhooks/payment
Process incoming webhook events
- **Headers**: 
  - `X-Webhook-Signature` (required) - HMAC SHA256 signature
  - `X-Webhook-Timestamp` (required) - Unix timestamp
  - `Content-Type: application/json`
- **Body**: JSON payload with transaction data
- **Response**: Transaction details with processing fees

### GET /webhooks/generate-test
Generate test signature and curl command
- **Query Params**: 
  - `baseUrl` (optional) - Base URL for curl command (default: http://localhost:3000)
- **Response**: Ready-to-use curl command with valid signature

### GET /webhooks/health
Health check endpoint
- **Response**: Status and timestamp

## Project Structure
```
webhook-payment-verification/
├── src/
│   ├── app.ts                 # Application entry point
│   ├── config/
│   │   └── database.ts        # Database configuration
│   ├── entities/
│   │   └── Transaction.entity.ts
│   ├── routes/
│   │   └── webhook.routes.ts
│   ├── services/
│   │   └── webhookService.ts
│   ├── utils/
│   │   └── signatureValidator.ts
│   └── validators/
│       └── transactionValidator.ts
├── migrations/
│   └── 001_initial_schema.sql
├── .env
├── .gitignore
└── package.json
```

