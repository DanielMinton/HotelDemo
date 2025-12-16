'use client';

import { useEffect, useState } from 'react';
import { Phone, MessageSquare, Clock, TrendingUp, Users, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

interface DashboardStats {
  totalCalls: number;
  successRate: number;
  avgDuration: number;
  activeBookings: number;
  todayCheckIns: number;
  pendingIssues: number;
  scheduledCalls: number;
  avgSentiment: number;
}

interface RecentCall {
  id: string;
  template: string;
  phoneNumber: string;
  duration: number;
  status: string;
  sentiment: number | null;
  createdAt: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboardData() {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentCalls(data.recentCalls);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 border-b border-purple-500/20 pb-6">
          <h1 className="text-4xl font-black text-transparent bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text">Hotel Voice AI Dashboard</h1>
          <p className="text-gray-400 mt-2 font-medium">Real-time monitoring of your AI voice assistants</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Calls Today"
            value={stats?.totalCalls || 0}
            icon={<Phone className="w-6 h-6" />}
            color="blue"
          />
          <StatCard
            title="Success Rate"
            value={`${(stats?.successRate || 0).toFixed(1)}%`}
            icon={<CheckCircle className="w-6 h-6" />}
            color="green"
          />
          <StatCard
            title="Avg Duration"
            value={`${Math.floor((stats?.avgDuration || 0) / 60)}:${((stats?.avgDuration || 0) % 60).toString().padStart(2, '0')}`}
            icon={<Clock className="w-6 h-6" />}
            color="purple"
          />
          <StatCard
            title="Avg Sentiment"
            value={formatSentiment(stats?.avgSentiment || 0)}
            icon={<TrendingUp className="w-6 h-6" />}
            color={getSentimentColor(stats?.avgSentiment || 0)}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Active Bookings"
            value={stats?.activeBookings || 0}
            icon={<Calendar className="w-6 h-6" />}
            color="indigo"
          />
          <StatCard
            title="Today's Check-ins"
            value={stats?.todayCheckIns || 0}
            icon={<Users className="w-6 h-6" />}
            color="cyan"
          />
          <StatCard
            title="Pending Issues"
            value={stats?.pendingIssues || 0}
            icon={<AlertTriangle className="w-6 h-6" />}
            color={stats?.pendingIssues && stats.pendingIssues > 0 ? 'red' : 'gray'}
          />
        </div>

        {/* Recent Calls Table */}
        <div className="bg-black/50 rounded-xl shadow-lg border border-teal-500/30 overflow-hidden backdrop-blur-sm">
          <div className="px-6 py-4 border-b border-purple-500/20">
            <h2 className="text-lg font-bold text-transparent bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text">Recent Calls</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-purple-500/20">
              <thead className="bg-black/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-teal-400 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-teal-400 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-teal-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-teal-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-teal-400 uppercase tracking-wider">
                    Sentiment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-teal-400 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-black/30 divide-y divide-purple-500/20">
                {recentCalls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      No calls recorded yet. Start making calls to see data here.
                    </td>
                  </tr>
                ) : (
                  recentCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-purple-500/10 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTemplateBadgeColor(call.template)}`}>
                          {formatTemplate(call.template)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {call.phoneNumber || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusBadgeColor(call.status)}`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {call.sentiment !== null ? (
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${getSentimentDotColor(call.sentiment)}`} />
                            <span className="text-sm text-gray-300">{formatSentiment(call.sentiment)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatTime(call.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            title="Seed Database"
            description="Initialize hotel data, rooms, and knowledge base"
            action={async () => {
              const response = await fetch('/api/seed', { method: 'POST' });
              const data = await response.json();
              alert(data.success ? 'Database seeded successfully!' : `Error: ${data.error}`);
              fetchDashboardData();
            }}
          />
          <ActionCard
            title="Process Proactive Calls"
            description="Manually trigger scheduled proactive calls"
            action={async () => {
              const response = await fetch('/api/cron/proactive-calls?type=process', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET || 'dev'}` },
              });
              const data = await response.json();
              alert(`Processed ${data.processed || 0} calls`);
            }}
          />
          <ActionCard
            title="Sync with PMS"
            description="Pull latest reservations from property management system"
            action={async () => {
              const response = await fetch('/api/cron/proactive-calls?type=sync', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET || 'dev'}` },
              });
              const data = await response.json();
              alert(`Synced ${data.pmsSync?.synced || 0} reservations`);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-teal-500/20 text-teal-400 shadow-lg shadow-teal-500/10',
    green: 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10',
    purple: 'bg-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/10',
    red: 'bg-red-500/20 text-red-400 shadow-lg shadow-red-500/10',
    gray: 'bg-gray-500/20 text-gray-400 shadow-lg shadow-gray-500/10',
    indigo: 'bg-indigo-500/20 text-indigo-400 shadow-lg shadow-indigo-500/10',
    cyan: 'bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10',
  };

  return (
    <div className="bg-black/50 rounded-xl shadow-lg border border-purple-500/30 p-6 backdrop-blur-sm hover:border-teal-500/50 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 font-bold uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-black text-transparent bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text mt-2">{value}</p>
        </div>
        <div className={`p-4 rounded-lg ${colorClasses[color] || colorClasses.gray}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, action }: { title: string; description: string; action: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black/50 rounded-xl shadow-lg border border-teal-500/30 p-6 backdrop-blur-sm hover:border-purple-500/50 transition-all">
      <h3 className="font-bold text-transparent bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text">{title}</h3>
      <p className="text-sm text-gray-400 mt-2">{description}</p>
      <button
        onClick={handleClick}
        disabled={loading}
        className="mt-4 w-full px-4 py-3 bg-gradient-to-r from-teal-600 to-purple-600 hover:from-teal-500 hover:to-purple-500 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg shadow-teal-500/20"
      >
        {loading ? 'Processing...' : 'Run'}
      </button>
    </div>
  );
}

// Helper functions
function formatTemplate(template: string): string {
  return template.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function getTemplateBadgeColor(template: string): string {
  switch (template) {
    case 'CONCIERGE':
      return 'bg-teal-500/30 text-teal-300 border border-teal-500/50';
    case 'BOOKING_SQUAD':
      return 'bg-purple-500/30 text-purple-300 border border-purple-500/50';
    case 'PROACTIVE_SERVICES':
      return 'bg-orange-500/30 text-orange-300 border border-orange-500/50';
    default:
      return 'bg-gray-500/30 text-gray-300 border border-gray-500/50';
  }
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'ENDED':
      return 'bg-gray-500/30 text-gray-300 border border-gray-500/50';
    case 'IN_PROGRESS':
      return 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50';
    case 'FAILED':
      return 'bg-red-500/30 text-red-300 border border-red-500/50';
    default:
      return 'bg-orange-500/30 text-orange-300 border border-orange-500/50';
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatSentiment(sentiment: number): string {
  if (sentiment >= 0.5) return 'Positive';
  if (sentiment >= 0) return 'Neutral';
  if (sentiment >= -0.5) return 'Negative';
  return 'Very Negative';
}

function getSentimentColor(sentiment: number): string {
  if (sentiment >= 0.3) return 'emerald';
  if (sentiment >= -0.3) return 'gray';
  return 'red';
}

function getSentimentDotColor(sentiment: number): string {
  if (sentiment >= 0.3) return 'bg-emerald-500 shadow-lg shadow-emerald-500/50';
  if (sentiment >= -0.3) return 'bg-gray-400 shadow-lg shadow-gray-400/30';
  return 'bg-red-500 shadow-lg shadow-red-500/50';
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString();
}
