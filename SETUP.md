# VAPI Hotel Templates - Setup Guide

Complete step-by-step guide to get your hotel voice AI system running.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Node.js 18+ installed
- [ ] PostgreSQL database (local or cloud)
- [ ] VAPI account ([sign up at vapi.ai](https://vapi.ai))
- [ ] Code editor (VS Code recommended)

---

## Step 1: Clone and Install

```bash
# Navigate to your projects directory
cd /path/to/your/projects

# Clone the repository (or copy the files)
git clone <your-repo-url> vapi-hotel-templates
cd vapi-hotel-templates

# Install dependencies
npm install
```

---

## Step 2: Set Up PostgreSQL Database

### Option A: Local PostgreSQL

```bash
# macOS with Homebrew
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb hotel_voice_ai
```

### Option B: Cloud Database (Recommended for Production)

Choose one of these providers:

| Provider | Free Tier | Setup Link |
|----------|-----------|------------|
| **Supabase** | 500MB | [supabase.com](https://supabase.com) |
| **Neon** | 512MB | [neon.tech](https://neon.tech) |
| **Railway** | $5 credit | [railway.app](https://railway.app) |
| **Vercel Postgres** | 256MB | [vercel.com/storage](https://vercel.com/storage) |

After creating a database, copy the connection string. It looks like:
```
postgresql://username:password@host:5432/database_name
```

---

## Step 3: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Open in your editor
code .env  # or nano .env, vim .env, etc.
```

### Required Variables

Edit `.env` with your values:

```env
# DATABASE (Required)
DATABASE_URL="postgresql://username:password@host:5432/hotel_voice_ai"

# VAPI (Required)
VAPI_API_KEY=your_vapi_api_key
VAPI_PHONE_NUMBER_ID=your_phone_number_id
VAPI_SERVER_URL=https://your-domain.vercel.app/api/vapi/webhook
VAPI_WEBHOOK_SECRET=generate_a_random_secret
```

### How to Get VAPI Credentials

1. **VAPI_API_KEY**
   - Go to [dashboard.vapi.ai](https://dashboard.vapi.ai)
   - Click on your profile → "API Keys"
   - Create a new API key and copy it

2. **VAPI_PHONE_NUMBER_ID**
   - Go to "Phone Numbers" in VAPI dashboard
   - Purchase a phone number ($2-5/month)
   - Copy the Phone Number ID (not the phone number itself)

3. **VAPI_WEBHOOK_SECRET**
   - Generate a random string: `openssl rand -hex 32`
   - You'll configure this in VAPI dashboard later

---

## Step 4: Set Up the Database Schema

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

You should see output like:
```
Your database is now in sync with your Prisma schema.
```

### Verify Database (Optional)

```bash
# Open Prisma Studio to view your database
npx prisma studio
```

This opens a browser at `http://localhost:5555` where you can view your tables.

---

## Step 5: Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the landing page.

---

## Step 6: Seed the Database

In a new terminal, seed the database with initial hotel data:

```bash
curl -X POST http://localhost:3000/api/seed
```

Or open in browser: [http://localhost:3000/api/seed](http://localhost:3000/api/seed) (GET shows status)

Expected response:
```json
{
  "success": true,
  "message": "Database seeded successfully",
  "stats": {
    "roomTypes": 5,
    "rooms": 75,
    "pricingRules": 5,
    "knowledgeDocuments": 16,
    "guests": 1,
    "reservations": 1
  }
}
```

---

## Step 7: Expose Local Server (for Testing)

VAPI needs to reach your webhook. Use ngrok for local testing:

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

Update your `.env`:
```env
VAPI_SERVER_URL=https://abc123.ngrok.io/api/vapi/webhook
```

Restart your dev server after changing `.env`.

---

## Step 8: Configure VAPI Webhook

1. Go to [dashboard.vapi.ai](https://dashboard.vapi.ai)
2. Navigate to **Account** → **Settings**
3. Under **Server URL**, enter: `https://your-ngrok-url/api/vapi/webhook`
4. Under **Server Secret**, enter the same value as `VAPI_WEBHOOK_SECRET` in your `.env`
5. Click **Save**

---

## Step 9: Test Your Setup

### Test via VAPI Dashboard

1. Go to VAPI Dashboard → **Assistants**
2. Click **Create Assistant** or use the test feature
3. Make a test call to verify the webhook is working

### Test via Dashboard

1. Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
2. You should see the monitoring dashboard
3. After test calls, data will appear here

### Verify Webhook

Check your terminal for webhook logs:
```
Webhook received: assistant-request
Webhook processed in 45ms
```

---

## Step 10: Optional Services Setup

### Template 1: Concierge (Knowledge Base)

For RAG-powered knowledge search, set up Trieve:

1. Sign up at [trieve.ai](https://trieve.ai)
2. Create a dataset
3. Add to `.env`:
   ```env
   TRIEVE_API_KEY=your_trieve_api_key
   TRIEVE_DATASET_ID=your_dataset_id
   ```

### Template 2: Booking Squad

For payment processing and notifications:

```env
# Stripe (stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# SendGrid (sendgrid.com) - Email
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=reservations@yourhotel.com

# Twilio (twilio.com) - SMS
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+15551234567
```

### Template 3: Proactive Services

For outbound calls and PMS integration:

```env
# Cron authentication
CRON_SECRET=generate_random_secret

# Weather API (openweathermap.org)
WEATHER_API_KEY=your_api_key

# Slack notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# PMS Integration (if using)
PMS_API_URL=https://api.your-pms.com
PMS_API_KEY=your_pms_key
PMS_HOTEL_ID=your_hotel_id
```

---

## Step 11: Deploy to Production

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts to configure project
```

### Configure Production Environment

In Vercel Dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add all variables from your `.env` file
3. Update `VAPI_SERVER_URL` to your Vercel domain:
   ```
   https://your-project.vercel.app/api/vapi/webhook
   ```

### Update VAPI Webhook

1. Go to VAPI Dashboard
2. Update Server URL to your Vercel domain
3. Verify webhook secret matches

### Push Database Schema (Production)

```bash
# Set production DATABASE_URL and run
DATABASE_URL="your_production_url" npx prisma db push
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
npx prisma db pull

# If using SSL (cloud databases)
# Add ?sslmode=require to DATABASE_URL
DATABASE_URL="postgresql://...?sslmode=require"
```

### Webhook Not Receiving Calls

1. Check ngrok is running and URL matches `.env`
2. Verify VAPI Server URL in dashboard
3. Check VAPI_WEBHOOK_SECRET matches in both places
4. Look for errors in terminal logs

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Regenerate Prisma client
npx prisma generate

# Rebuild
npm run build
```

### Prisma Schema Issues

```bash
# Reset database (WARNING: deletes all data)
npx prisma db push --force-reset

# Re-seed
curl -X POST http://localhost:3000/api/seed
```

---

## Quick Reference

### Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npx prisma studio` | Open database GUI |
| `npx prisma db push` | Sync schema to database |
| `npx prisma generate` | Generate Prisma client |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vapi/webhook` | POST | VAPI webhook handler |
| `/api/seed` | POST | Seed database |
| `/api/seed` | GET | Check seed status |
| `/api/dashboard` | GET | Dashboard statistics |
| `/api/cron/proactive-calls` | GET/POST | Process scheduled calls |

### Key Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables |
| `prisma/schema.prisma` | Database schema |
| `src/lib/vapi/config.ts` | Assistant configurations |
| `vercel.json` | Cron job schedules |

---

## Next Steps

1. **Customize Assistants**: Edit `src/lib/vapi/config.ts` to change prompts and behavior
2. **Add Knowledge**: Update `src/lib/services/knowledge-base.ts` with your hotel info
3. **Configure Rooms**: Modify room types in `src/lib/services/booking.ts`
4. **Set Up Monitoring**: Connect Slack for alerts in production
5. **Test Thoroughly**: Make test calls before going live

---

## Support

- [VAPI Documentation](https://docs.vapi.ai)
- [Prisma Documentation](https://prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)

---

**You're all set!** Your hotel voice AI system is ready to handle calls.
