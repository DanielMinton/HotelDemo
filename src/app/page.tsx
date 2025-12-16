import Link from 'next/link';
import { Phone, MessageSquare, Calendar, Users, Sparkles, ArrowRight, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      {/* Animated background with portfolio colors */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="relative border-b border-teal-500/20 backdrop-blur-md bg-black/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/50">
              <Phone className="w-5 h-5 text-black font-bold" />
            </div>
            <span className="font-bold text-transparent bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-xl">VAPI Hotel Templates</span>
          </div>
          <Link
            href="/dashboard"
            className="px-5 py-2 bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-400 hover:to-purple-500 text-black font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-teal-500/50"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/10 border border-teal-500/30 rounded-full text-teal-400 text-sm mb-8 font-bold">
            <Sparkles className="w-4 h-4" />
            Powered by VAPI AI
          </div>
          <h1 className="text-6xl md:text-7xl font-black text-white mb-6 leading-tight tracking-tight">
            Voice AI for
            <span className="block bg-gradient-to-r from-teal-400 via-purple-500 to-orange-400 bg-clip-text text-transparent animate-pulse">Hotels</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 font-medium">
            Three production-ready voice AI templates for hotel operations. Handle concierge inquiries, process bookings, and provide proactive guest services.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-black font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-teal-500/50"
            >
              <Zap className="w-5 h-5" />
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://docs.vapi.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-purple-500/50"
            >
              VAPI Docs
            </a>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          <TemplateCard
            icon={<MessageSquare className="w-6 h-6" />}
            title="Intelligent Concierge"
            description="RAG-powered knowledge base with multi-language support. Answer guest inquiries, make service bookings, and detect sentiment."
            features={['15+ Languages', 'Knowledge Base RAG', 'Sentiment Analysis', 'Service Booking']}
            color="teal"
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
            color="orange"
          />
        </div>

        {/* Tech Stack */}
        <div className="bg-gradient-to-br from-black/80 to-black/60 rounded-2xl border border-purple-500/30 p-8 backdrop-blur-sm">
          <h2 className="text-3xl font-black text-transparent bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text mb-8 text-center">Built With</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <TechBadge name="Next.js 15" color="teal" />
            <TechBadge name="TypeScript" color="purple" />
            <TechBadge name="VAPI AI" color="teal" />
            <TechBadge name="OpenAI GPT-4" color="purple" />
            <TechBadge name="ElevenLabs" color="orange" />
            <TechBadge name="Deepgram" color="teal" />
            <TechBadge name="Prisma" color="purple" />
            <TechBadge name="PostgreSQL" color="orange" />
            <TechBadge name="Stripe" color="teal" />
            <TechBadge name="Twilio" color="purple" />
            <TechBadge name="SendGrid" color="orange" />
            <TechBadge name="Trieve" color="teal" />
          </div>
        </div>

        {/* Quick Start */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-black text-transparent bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text mb-6">Quick Start</h2>
          <div className="bg-black/80 rounded-xl border-2 border-teal-500/50 p-6 max-w-2xl mx-auto text-left backdrop-blur-sm shadow-lg shadow-teal-500/20">
            <pre className="text-sm text-teal-300 overflow-x-auto font-mono">
              <code>{`# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Push database schema
npx prisma db push

# Seed initial data
curl -X POST http://localhost:3001/api/seed

# Start development server
npm run dev`}</code>
            </pre>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-purple-500/20 mt-24 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-400 text-sm font-medium">Built with <span className="text-teal-400 font-bold">VAPI AI Platform</span> • <span className="text-purple-400 font-bold">Open Source</span> Hotel Voice AI Templates</p>
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
  color: 'teal' | 'purple' | 'orange';
}) {
  const colorClasses = {
    teal: 'from-teal-500/20 to-teal-600/20 border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/30',
  };

  const iconColorClasses = {
    teal: 'bg-teal-500/30 text-teal-400 shadow-lg shadow-teal-500/20',
    purple: 'bg-purple-500/30 text-purple-400 shadow-lg shadow-purple-500/20',
    orange: 'bg-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/20',
  };

  const badgeColors = {
    teal: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl border p-8 hover:scale-105 transition-all backdrop-blur-sm`}>
      <div className={`w-14 h-14 rounded-xl ${iconColorClasses[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-300 text-sm mb-6">{description}</p>
      <div className="flex flex-wrap gap-2">
        {features.map((feature) => (
          <span key={feature} className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColors[color]}`}>
            {feature}
          </span>
        ))}
      </div>
    </div>
  );
}

function TechBadge({ name, color }: { name: string; color: 'teal' | 'purple' | 'orange' }) {
  const colorClasses = {
    teal: 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-lg shadow-teal-500/10',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-lg shadow-purple-500/10',
    orange: 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-lg shadow-orange-500/10',
  };

  return (
    <div className={`flex items-center justify-center px-4 py-3 ${colorClasses[color]} rounded-lg text-sm font-bold border backdrop-blur-sm hover:scale-110 transition-transform cursor-pointer`}>
      {name}
    </div>
  );
}
