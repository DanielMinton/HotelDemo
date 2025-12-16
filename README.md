# VAPI Hotel Voice AI Templates

Production-ready voice AI templates for hotel operations using [VAPI](https://vapi.ai). Handle guest inquiries, process bookings, and provide proactive services with AI-powered voice assistants.

## Templates Overview

### 1. Intelligent Concierge
RAG-powered knowledge base with multi-language support (15+ languages).
- Answer guest inquiries about amenities, services, and policies
- Make service reservations (spa, dining, activities)
- Detect sentiment and identify VIP opportunities
- Automatic language detection and switching

### 2. Smart Booking Squad
Multi-agent booking workflow with 4 specialized AI assistants.
- **Greeter**: Welcome guests and confirm booking intent
- **Qualifier**: Gather dates, guests, preferences
- **Room Specialist**: Present options and handle upsells
- **Booking Agent**: Process payment and send confirmations

### 3. Proactive Guest Services
Automated outbound calls at key moments in the guest journey.
- Pre-arrival confirmation (24 hours before check-in)
- Wake-up calls with weather and schedule
- Mid-stay check-in for satisfaction
- Pre-checkout assistance
- Post-stay follow-up and review requests

## Tech Stack

- **Framework**: Next.js 15 + TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Voice AI**: VAPI SDK
- **LLM**: OpenAI GPT-4o
- **TTS**: ElevenLabs
- **STT**: Deepgram
- **Knowledge Base**: Trieve (RAG)
- **Payments**: Stripe
- **Notifications**: SendGrid + Twilio
- **Deployment**: Vercel

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/vapi-hotel-templates.git
cd vapi-hotel-templates

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Push database schema
npx prisma db push

# Start development server
npm run dev

# Seed initial data (in another terminal)
curl -X POST http://localhost:3000/api/seed
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

### Required for All Templates
```env
DATABASE_URL=postgresql://...
VAPI_API_KEY=your_vapi_key
VAPI_PHONE_NUMBER_ID=your_phone_id
VAPI_SERVER_URL=https://your-domain.com/api/vapi/webhook
VAPI_WEBHOOK_SECRET=your_webhook_secret
```

### Template 1: Concierge
```env
TRIEVE_API_KEY=your_trieve_key
TRIEVE_DATASET_ID=your_dataset_id
```

### Template 2: Booking Squad
```env
STRIPE_SECRET_KEY=sk_...
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=reservations@hotel.com
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

### Template 3: Proactive Services
```env
PMS_API_URL=https://api.your-pms.com
PMS_API_KEY=your_pms_key
CRON_SECRET=your_cron_secret
WEATHER_API_KEY=your_openweathermap_key
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── vapi/webhook/     # Main VAPI webhook handler
│   │   │   ├── cron/             # Scheduled task handlers
│   │   │   ├── dashboard/        # Dashboard API
│   │   │   └── seed/             # Database seeding
│   │   ├── dashboard/            # Dashboard UI
│   │   └── page.tsx              # Landing page
│   └── lib/
│       ├── db/                   # Prisma client
│       ├── vapi/
│       │   ├── types.ts          # VAPI type definitions
│       │   ├── config.ts         # Assistant configurations
│       │   └── security.ts       # Webhook verification
│       └── services/
│           ├── knowledge-base.ts # RAG search service
│           ├── booking.ts        # Booking operations
│           └── proactive.ts      # Outbound call service
├── prisma/
│   └── schema.prisma             # Database schema
└── vercel.json                   # Cron job configuration
```

## VAPI Configuration

### Webhook Setup
1. Deploy your application to get a public URL
2. In VAPI Dashboard, set webhook URL to: `https://your-domain.com/api/vapi/webhook`
3. Configure webhook secret in both VAPI and your environment

### Phone Number
1. Purchase a phone number in VAPI Dashboard
2. Copy the Phone Number ID to `VAPI_PHONE_NUMBER_ID`
3. Configure the phone number to use your webhook

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard
```

The `vercel.json` includes cron job configurations for proactive calls:
- Schedule calls: Daily at 8 AM
- Process calls: Every 5 minutes
- Wake-up calls: Every minute
- PMS sync: Every 15 minutes

### Database

Use any PostgreSQL provider:
- Vercel Postgres
- Supabase
- Railway
- Neon
- PlanetScale

## Testing

### Local Testing
```bash
# Start the dev server
npm run dev

# Test webhook locally with ngrok
ngrok http 3000

# Update VAPI webhook URL to ngrok URL
```

### Making Test Calls
1. Go to VAPI Dashboard
2. Navigate to your assistant
3. Click "Test Call" to simulate an inbound call

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vapi/webhook` | POST | Main VAPI webhook handler |
| `/api/cron/proactive-calls` | GET/POST | Process scheduled calls |
| `/api/seed` | POST | Seed database with initial data |
| `/api/seed` | GET | Check seed status |
| `/api/dashboard` | GET | Dashboard statistics |

## Cost Estimation

| Template | Monthly Cost (100-room hotel) |
|----------|------------------------------|
| Concierge | $400 - $750 |
| Booking Squad | $570 - $900 |
| Proactive Services | $1,100 - $1,700 |

Costs include VAPI usage, OpenAI, ElevenLabs, and external services.

## Security Best Practices

- All webhook requests are verified with HMAC-SHA256
- Sensitive data is encrypted at rest
- Phone numbers are validated (E.164 format)
- Rate limiting on API endpoints
- Environment variables for all secrets

## License

MIT License - feel free to use for your hotel!

## Support

- [VAPI Documentation](https://docs.vapi.ai)
- [GitHub Issues](https://github.com/your-org/vapi-hotel-templates/issues)
