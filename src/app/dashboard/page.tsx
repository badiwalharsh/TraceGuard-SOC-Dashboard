'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  AlertTriangle, 
  Clock, 
  Server, 
  Activity, 
  ShieldAlert, 
  RefreshCw,
  TrendingUp,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface DashboardData {
  stats: {
    openIncidents: number;
    criticalIncidents: number;
    activeAssets: number;
    mttr: string;
    threatScore: number;
  };
  severityChartData: { name: string; value: number; color: string }[];
  trendChartData: { date: string; alerts: number }[];
  recentCriticalIncidents: {
    id: string;
    title: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: string;
    createdAt: string;
    category: string;
    assignedTo: { name: string } | null;
  }[];
  topAffectedHosts: { hostname: string; count: number; criticality: string }[];
}

export default function OverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/dashboard/metrics');
      if (res.ok) {
        const metrics = await res.json();
        setData(metrics);
      }
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const liveThreatAssessment = (score: number) => {
    if (score === 0) return { label: 'SECURE', color: 'text-cyber-green border-cyber-green/30 bg-cyber-green/5 bg-cyber-green/10' };
    if (score < 10) return { label: 'LOW RISK', color: 'text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/5' };
    if (score < 25) return { label: 'MODERATE RISK', color: 'text-cyber-amber border-cyber-amber/30 bg-cyber-amber/5' };
    return { label: 'HIGH THREAT LEVEL', color: 'text-cyber-red border-cyber-red/35 bg-cyber-red/5 glow-red' };
  };

  const statusColors: Record<string, string> = {
    NEW: 'text-cyber-red bg-cyber-red/10 border-cyber-red/20',
    OPEN: 'text-cyber-amber bg-cyber-amber/10 border-cyber-amber/20',
    INVESTIGATING: 'text-cyber-blue bg-cyber-blue/10 border-cyber-blue/20',
    CONTAINED: 'text-cyber-cyan bg-cyber-cyan/10 border-cyber-cyan/20',
    RESOLVED: 'text-cyber-green bg-cyber-green/10 border-cyber-green/20',
    CLOSED: 'text-cyber-muted bg-cyber-muted/10 border-cyber-muted/20'
  };

  if (loading || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-10 w-10 text-cyber-cyan animate-spin" />
          <span className="text-sm font-mono text-cyber-muted">Acquiring Threat Matrix Feed...</span>
        </div>
      </div>
    );
  }

  const threatAssessment = liveThreatAssessment(data.stats.threatScore);

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">SOC Dashboard</h2>
          <p className="text-sm text-cyber-muted">Operational monitoring status, alert distributions, and endpoint health.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Risk Status Blinker */}
          <div className={`px-4 py-2 border rounded-xl flex items-center gap-3 ${threatAssessment.color}`}>
            <ShieldAlert className="h-5 w-5 animate-pulse" />
            <div>
              <span className="text-[10px] uppercase font-mono block tracking-wider leading-none text-cyber-muted">
                Threat Assessment
              </span>
              <span className="text-sm font-bold font-mono tracking-wide">{threatAssessment.label}</span>
            </div>
          </div>

          <button 
            onClick={loadMetrics} 
            disabled={refreshing}
            className="p-2.5 rounded-lg border border-cyber-border bg-cyber-panel text-cyber-muted hover:text-white transition"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Filters / Shortcuts Panel */}
      <div className="bg-cyber-panel border border-cyber-border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-cyber-muted uppercase tracking-wider mr-2">Quick Triage Filters:</span>
        
        <button
          onClick={() => router.push('/dashboard/incidents?severity=CRITICAL')}
          className="px-3.5 py-1.5 rounded-lg bg-cyber-red/10 hover:bg-cyber-red/20 border border-cyber-red/25 text-cyber-red font-semibold text-xs transition"
        >
          Critical Threats
        </button>

        <button
          onClick={() => router.push('/dashboard/incidents?severity=HIGH')}
          className="px-3.5 py-1.5 rounded-lg bg-cyber-amber/10 hover:bg-cyber-amber/20 border border-cyber-amber/25 text-cyber-amber font-semibold text-xs transition"
        >
          High Severity Alerts
        </button>

        <button
          onClick={() => router.push('/dashboard/incidents?assignee=ME')}
          className="px-3.5 py-1.5 rounded-lg bg-cyber-blue/10 hover:bg-cyber-blue/20 border border-cyber-blue/25 text-cyber-blue font-semibold text-xs transition"
        >
          Assigned to Me
        </button>

        <button
          onClick={() => router.push('/dashboard/incidents?status=UNRESOLVED')}
          className="px-3.5 py-1.5 rounded-lg bg-cyber-muted/10 hover:bg-cyber-muted/20 border border-cyber-border text-white font-semibold text-xs transition"
        >
          Unresolved Queue
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Open Incidents */}
        <div className="cyber-card p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-cyber-muted uppercase tracking-wider block">Open Incidents</span>
            <span className="text-3xl font-extrabold text-white">{data.stats.openIncidents}</span>
          </div>
          <div className="p-3 bg-cyber-blue/10 border border-cyber-blue/20 text-cyber-blue rounded-lg">
            <Activity className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 2: Critical Incidents */}
        <div className="cyber-card p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-cyber-muted uppercase tracking-wider block">Critical Alerts</span>
            <span className="text-3xl font-extrabold text-cyber-red">{data.stats.criticalIncidents}</span>
          </div>
          <div className="p-3 bg-cyber-red/10 border border-cyber-red/20 text-cyber-red rounded-lg glow-red">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 3: Active Assets */}
        <div className="cyber-card p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-cyber-muted uppercase tracking-wider block">Active Assets</span>
            <span className="text-3xl font-extrabold text-cyber-cyan">{data.stats.activeAssets}</span>
          </div>
          <div className="p-3 bg-cyber-cyan/10 border border-cyber-cyan/20 text-cyber-cyan rounded-lg">
            <Server className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 4: Mean Time to Resolve */}
        <div className="cyber-card p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-cyber-muted uppercase tracking-wider block">Mean Time to Resolve</span>
            <span className="text-3xl font-extrabold text-cyber-green">{data.stats.mttr}</span>
          </div>
          <div className="p-3 bg-cyber-green/10 border border-cyber-green/20 text-cyber-green rounded-lg">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Charts Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Alert Trend Chart */}
        <div className="cyber-card p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-cyber-border pb-4 mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyber-cyan" />
              Seven-Day Alert Trend
            </h3>
            <span className="text-xs text-cyber-muted">Total ingested alerts</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trendChartData}>
                <defs>
                  <linearGradient id="alertGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0e1322', borderColor: '#1d253d', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="alerts" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#alertGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity split bar chart */}
        <div className="cyber-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-cyber-border pb-4 mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyber-cyan" />
              Severity Breakdown
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.severityChartData}>
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0e1322', borderColor: '#1d253d', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.severityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid: Recent Critical Incidents Table & Top Affected Hosts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Critical Table */}
        <div className="cyber-card p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-cyber-border pb-4 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-cyber-red" />
                Recent Critical Threats
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left divide-y divide-cyber-border text-xs">
                <thead>
                  <tr className="text-cyber-muted font-bold">
                    <th className="py-2.5">Severity</th>
                    <th className="py-2.5">Incident Title</th>
                    <th className="py-2.5">Assignee</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Triage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyber-border">
                  {data.recentCriticalIncidents.map(inc => (
                    <tr key={inc.id} className="hover:bg-cyber-bg/40 transition">
                      <td className="py-3">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border leading-none ${inc.severity === 'CRITICAL' ? 'text-white bg-cyber-red border-cyber-red glow-red' : 'text-cyber-red bg-cyber-red/10 border-cyber-red/20'}`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-white block truncate max-w-xs">{inc.title}</span>
                        <span className="text-[9px] text-cyber-muted uppercase font-mono tracking-wider">{inc.category}</span>
                      </td>
                      <td className="py-3 text-cyber-muted">
                        {inc.assignedTo ? inc.assignedTo.name : 'Unassigned'}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold border ${statusColors[inc.status]}`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link href={`/dashboard/incidents/${inc.id}`} className="text-cyber-cyan hover:underline inline-flex items-center gap-0.5 font-semibold">
                          Open <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {data.recentCriticalIncidents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-cyber-muted font-mono italic">
                        No critical active threats reported in queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top Affected Hosts */}
        <div className="cyber-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-cyber-border pb-4 mb-4">
              <Server className="h-4 w-4 text-cyber-cyan" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Top Affected Hosts</h3>
            </div>

            <div className="divide-y divide-cyber-border">
              {data.topAffectedHosts.map((host, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="overflow-hidden">
                    <span className="text-xs font-bold text-white truncate block">{host.hostname}</span>
                    <span className="text-[9px] text-cyber-muted font-mono uppercase tracking-wider">
                      Crit: {host.criticality}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex px-2 py-0.5 rounded bg-cyber-red/10 border border-cyber-red/20 text-cyber-red text-xs font-bold font-mono">
                      {host.count} Alert(s)
                    </span>
                  </div>
                </div>
              ))}
              {data.topAffectedHosts.length === 0 && (
                <div className="py-8 text-center text-xs text-cyber-muted font-mono italic">
                  No hosts currently experiencing alerts.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
