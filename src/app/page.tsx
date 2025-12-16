import Link from 'next/link';
import { Phone, MessageSquare, Calendar, Users, Sparkles, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">VAPI Hotel Templates</span>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Powered by VAPI AI
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Voice AI for
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"> Hotels</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            Three production-ready voice AI templates for hotel operations. Handle concierge inquiries, process bookings, and provide proactive guest services.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://docs.vapi.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
            >
              VAPI Docs
            </a>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <TemplateCard
            icon={<MessageSquare className="w-6 h-6" />}
            title="Intelligent Concierge"
            description="RAG-powered knowledge base with multi-language support. Answer guest inquiries, make service bookings, and detect sentiment."
            features={['15+ Languages', 'Knowledge Base RAG', 'Sentiment Analysis', 'Service Booking']}
            color="blue"
          />
          <TemplateCard
            icon={<Calendar className="w-6 h-6" />}
            title="Smart Booking Squad"
            description="Multi-agent booking workflow with 4 specialized AI assistants. Handle the complete booking journey from greeting to payment."
            features={['4 AI Agents', 'Dynamic Pricing', 'Payment Processing', 'Confirmations']}
            color="purple"
          />
          <TemplateCard
            icon={<Users className="w-6 h-6" />}
            title="Proactive Services"
            description="Automated outbound calls at key moments. Pre-arrival, wake-up, mid-stay check-in, checkout, and post-stay follow-up."
            features={['PMS Integration', 'Scheduled Calls', 'Issue Detection', 'Guest Analytics']}
            color="green"
          />
        </div>

        {/* Tech Stack */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Built With</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <TechBadge name="Next.js 15" />
            <TechBadge name="TypeScript" />
            <TechBadge name="VAPI AI" />
            <TechBadge name="OpenAI GPT-4" />
            <TechBadge name="ElevenLabs" />
            <TechBadge name="Deepgram" />
            <TechBadge name="Prisma" />
            <TechBadge name="PostgreSQL" />
            <TechBadge name="Stripe" />
            <TechBadge name="Twilio" />
            <TechBadge name="SendGrid" />
            <TechBadge name="Trieve" />
          </div>
        </div>

        {/* Quick Start */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Quick Start</h2>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 max-w-2xl mx-auto text-left">
            <pre className="text-sm text-slate-300 overflow-x-auto">
              <code>{`# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Push database schema
npx prisma db push

# Seed initial data
curl -X POST http://localhost:3000/api/seed

# Start development server
npm run dev`}</code>
            </pre>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-slate-500 text-sm">
          <p>Built with VAPI AI Platform • Open Source Hotel Voice AI Templates</p>
        </div>
      </footer>
    </div>
  );
}

function TemplateCard({
  icon,
  title,
  description,
  features,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  color: 'blue' | 'purple' | 'green';
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
  };

  const iconColorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    green: 'bg-green-500/20 text-green-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl border p-6 hover:scale-105 transition-transform`}>
      <div className={`w-12 h-12 rounded-xl ${iconColorClasses[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm mb-4">{description}</p>
      <div className="flex flex-wrap gap-2">
        {features.map((feature) => (
          <span key={feature} className="px-2 py-1 bg-white/5 rounded text-xs text-slate-300">
            {feature}
          </span>
        ))}
      </div>
    </div>
  );
}

function TechBadge({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center px-4 py-3 bg-slate-700/50 rounded-lg text-slate-300 text-sm font-medium">
      {name}
    </div>
  );
}
