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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Hotel Voice AI Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time monitoring of your AI voice assistants</p>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Calls</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sentiment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentCalls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No calls recorded yet. Start making calls to see data here.
                    </td>
                  </tr>
                ) : (
                  recentCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTemplateBadgeColor(call.template)}`}>
                          {formatTemplate(call.template)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {call.phoneNumber || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(call.status)}`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {call.sentiment !== null ? (
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${getSentimentDotColor(call.sentiment)}`} />
                            <span className="text-sm text-gray-900">{formatSentiment(call.sentiment)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.gray}`}>
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
      <button
        onClick={handleClick}
        disabled={loading}
        className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      return 'bg-blue-100 text-blue-800';
    case 'BOOKING_SQUAD':
      return 'bg-purple-100 text-purple-800';
    case 'PROACTIVE_SERVICES':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'ENDED':
      return 'bg-gray-100 text-gray-800';
    case 'IN_PROGRESS':
      return 'bg-green-100 text-green-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
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
  if (sentiment >= 0.3) return 'green';
  if (sentiment >= -0.3) return 'gray';
  return 'red';
}

function getSentimentDotColor(sentiment: number): string {
  if (sentiment >= 0.3) return 'bg-green-500';
  if (sentiment >= -0.3) return 'bg-gray-400';
  return 'bg-red-500';
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
