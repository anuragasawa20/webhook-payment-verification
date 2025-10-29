#!/usr/bin/env node
/**
 * Webhook Signature Generator for Testing
 * This generates the HMAC SHA256 signature required to test the /webhooks/payment endpoint
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'abcd12345';

// Load .env file to get WEBHOOK_SECRET
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
            const [key, ...valueParts] = line.split('=');
            if (key && key.trim() === 'WEBHOOK_SECRET') {
                return valueParts.join('=').trim();
            }
        }
    }
    return null;
}

// Get secret from .env or use default
// const WEBHOOK_SECRET = loadEnv() || 'abcd12345';

// Test payload
const payload = {
    "event_id": "evt_8f7d6e5c4b3a2",
    "event_type": "transaction.completed",
    "timestamp": "2025-10-28T14:30:00Z",
    "data": {
        "transaction_id": "txn_1a2b3c4d5e6f",
        "amount": 2500.75,
        "currency": "USD",
        "sender": {
            "id": "usr_sender_12345",
            "name": "Alice Johnson",
            "email": "alice.j@example.com",
            "country": "US"
        },
        "receiver": {
            "id": "usr_receiver_67890",
            "name": "Raj Patel",
            "email": "raj.p@example.in",
            "country": "IN"
        },
        "status": "completed",
        "payment_method": "bank_transfer",
        "metadata": {
            "reference": "INV-2025-001",
            "notes": "Q4 payment"
        }
    }
};

console.log("WEBHOOK_SECRET", WEBHOOK_SECRET);
const payloadString = JSON.stringify(payload);
const timestamp = Math.floor(Date.now() / 1000).toString();

// Generate signature WITHOUT timestamp (basic)
const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payloadString)
    .digest('hex');

// Generate signature WITH timestamp (secure - used by your endpoint)
const signedPayload = `${timestamp}.${payloadString}`;
const signatureWithTimestamp = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

// Display results
console.log('\n' + '='.repeat(70));
console.log('🔐 WEBHOOK SIGNATURE GENERATOR');
console.log('='.repeat(70));
console.log(`\n🔑 Using Secret: ${WEBHOOK_SECRET.substring(0, 10)}...`);
console.log(`⏰ Current Timestamp: ${timestamp}`);

console.log('\n' + '='.repeat(70));
console.log('📋 COPY THESE VALUES FOR POSTMAN');
console.log('='.repeat(70));
console.log('\n✅ USE THESE HEADERS:\n');
console.log(`X-Webhook-Signature: ${signatureWithTimestamp}`);
console.log(`X-Webhook-Timestamp: ${timestamp}`);

console.log('\n' + '='.repeat(70));
console.log('📮 POSTMAN SETUP');
console.log('='.repeat(70));
console.log('\n1. Method: POST');
console.log('2. URL: http://localhost:3000/webhooks/payment');
console.log('\n3. Headers Tab - Add these 3 headers:');
console.log('   ├─ Content-Type: application/json');
console.log(`   ├─ X-Webhook-Signature: ${signatureWithTimestamp}`);
console.log(`   └─ X-Webhook-Timestamp: ${timestamp}`);
console.log('\n4. Body Tab - Select "raw" and "JSON", paste this:\n');
console.log(JSON.stringify(payload, null, 2));

console.log('\n' + '='.repeat(70));
console.log('💻 CURL COMMAND (Ready to Copy & Run)');
console.log('='.repeat(70));
console.log('\n');
console.log(`curl -X POST http://localhost:3000/webhooks/payment \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "X-Webhook-Signature: ${signatureWithTimestamp}" \\`);
console.log(`  -H "X-Webhook-Timestamp: ${timestamp}" \\`);
console.log(`  -d '${payloadString}'`);

console.log('\n' + '='.repeat(70));
console.log('⚠️  IMPORTANT NOTES');
console.log('='.repeat(70));
console.log('• Signature expires in 5 minutes (300 seconds)');
console.log('• If you get "401 Unauthorized", regenerate signature');
console.log('• Make sure your .env has: WEBHOOK_SECRET=' + WEBHOOK_SECRET);
console.log('• For testing without signature, use: /webhooks/payment-test');
console.log('='.repeat(70) + '\n');

