'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  ArrowRight, 
  User as UserIcon,
  RefreshCw,
  Plus,
  ArrowUpDown,
  Calendar
} from 'lucide-react';

interface Asset {
  hostname: string;
  ipAddress: string;
}

interface Rule {
  name: string;
  mitreAttack: string;
}

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'NEW' | 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  sourceIp: string | null;
  destIp: string | null;
  createdAt: string;
  assignedTo: User | null;
  rule: Rule | null;
  assets: Asset[];
}

function IncidentQueueContent() {
  const searchParams = useSearchParams();
  
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Filter States (initialized from URL parameters if present)
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState(searchParams.get('severity') || 'ALL');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [assigneeFilter, setAssigneeFilter] = useState(searchParams.get('assignee') || 'ALL');
  
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting State
  const [sortField, setSortField] = useState<'severity' | 'createdAt' | 'status' | 'title'>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const loadData = async () => {
    try {
      setLoading(true);
      const userRes = await fetch('/api/auth/me');
      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUser(userData.user);
      }

      const incRes = await fetch('/api/incidents');
      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidents(incData.incidents || []);
      }
    } catch (error) {
      console.error('Failed to load incident queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter();

  const handleRowClick = (id: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    router.push(`/dashboard/incidents/${id}`);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSort = (field: 'severity' | 'createdAt' | 'status' | 'title') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filter & Sort Incidents
  const processedIncidents = useMemo(() => {
    // 1. Apply Filters
    const result = incidents.filter(inc => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const match = 
          inc.title.toLowerCase().includes(q) ||
          inc.description.toLowerCase().includes(q) ||
          inc.category.toLowerCase().includes(q) ||
          (inc.sourceIp && inc.sourceIp.includes(q)) ||
          (inc.destIp && inc.destIp.includes(q)) ||
          (inc.assignedTo && inc.assignedTo.name.toLowerCase().includes(q)) ||
          (inc.rule && inc.rule.name.toLowerCase().includes(q)) ||
          (inc.assets && inc.assets.some(a => a.hostname.toLowerCase().includes(q)));
        if (!match) return false;
      }

      // Severity
      if (severityFilter !== 'ALL' && inc.severity !== severityFilter) {
        return false;
      }

      // Status
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'UNRESOLVED') {
          if (inc.status === 'RESOLVED' || inc.status === 'CLOSED') return false;
        } else if (inc.status !== statusFilter) {
          return false;
        }
      }

      // Assignee
      if (assigneeFilter !== 'ALL') {
        if (assigneeFilter === 'UNASSIGNED' && inc.assignedTo !== null) {
          return false;
        }
        if (assigneeFilter === 'ME' && (!inc.assignedTo || inc.assignedTo.id !== currentUser?.id)) {
          return false;
        }
      }

      // Date Range
      if (startDate) {
        const start = new Date(startDate).getTime();
        const created = new Date(inc.createdAt).getTime();
        if (created < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include full end day
        const created = new Date(inc.createdAt).getTime();
        if (created > end.getTime()) return false;
      }

      return true;
    });

    // 2. Apply Sorting
    const severityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'severity') {
        comparison = severityWeight[a.severity] - severityWeight[b.severity];
      } else if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      }

      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [incidents, search, severityFilter, statusFilter, assigneeFilter, startDate, endDate, sortField, sortAsc, currentUser]);

  // Paginated Results
  const paginatedIncidents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedIncidents.slice(startIndex, startIndex + itemsPerPage);
  }, [processedIncidents, currentPage]);

  const totalPages = Math.ceil(processedIncidents.length / itemsPerPage) || 1;

  const severityColors = {
    LOW: 'text-cyber-muted bg-cyber-muted/10 border-cyber-muted/20',
    MEDIUM: 'text-cyber-amber bg-cyber-amber/10 border-cyber-amber/20',
    HIGH: 'text-cyber-red bg-cyber-red/10 border-cyber-red/20',
    CRITICAL: 'text-white bg-cyber-red border-cyber-red glow-red font-bold'
  };

  const statusColors = {
    NEW: 'text-cyber-red bg-cyber-red/10 border-cyber-red/20',
    OPEN: 'text-cyber-amber bg-cyber-amber/10 border-cyber-amber/20',
    INVESTIGATING: 'text-cyber-blue bg-cyber-blue/10 border-cyber-blue/20',
    CONTAINED: 'text-cyber-cyan bg-cyber-cyan/10 border-cyber-cyan/20',
    RESOLVED: 'text-cyber-green bg-cyber-green/10 border-cyber-green/20',
    CLOSED: 'text-cyber-muted bg-cyber-muted/10 border-cyber-muted/20'
  };

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Incident Queue</h2>
          <p className="text-sm text-cyber-muted">Investigate alert context logs and manage incident triage states.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            className="p-2.5 rounded-lg border border-cyber-border bg-cyber-panel text-cyber-muted hover:text-white transition flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          
          {currentUser?.role === 'ADMIN' && (
            <Link
              href="/dashboard/incidents/create"
              className="px-4 py-2.5 rounded-lg bg-cyber-blue hover:bg-cyber-blue/90 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-lg shadow-cyber-blue/20"
            >
              <Plus className="h-4 w-4" />
              New Incident
            </Link>
          )}
        </div>
      </div>

      {/* Filtering Options Grid */}
      <div className="bg-cyber-panel border border-cyber-border rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative md:col-span-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-cyber-muted" />
            <input
              type="text"
              placeholder="Search host, IP, title, rules..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg bg-cyber-bg border border-cyber-border pl-10 pr-4 py-2 text-xs text-white placeholder-cyber-muted/50 focus:border-cyber-cyan focus:outline-none transition"
            />
          </div>

          {/* Severity filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-cyber-muted" />
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
              className="flex-1 rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white focus:border-cyber-cyan focus:outline-none transition"
            >
              <option value="ALL">All Severities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-cyber-muted" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="flex-1 rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white focus:border-cyber-cyan focus:outline-none transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNRESOLVED">Unresolved Queue</option>
              <option value="NEW">New</option>
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="CONTAINED">Contained</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Assignee filter */}
          <div className="flex items-center gap-2">
            <UserIcon className="h-3.5 w-3.5 text-cyber-muted" />
            <select
              value={assigneeFilter}
              onChange={(e) => { setAssigneeFilter(e.target.value); setCurrentPage(1); }}
              className="flex-1 rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white focus:border-cyber-cyan focus:outline-none transition"
            >
              <option value="ALL">All Assignees</option>
              <option value="ME">Assigned to Me</option>
              <option value="UNASSIGNED">Unassigned</option>
            </select>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-cyber-border/40 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-cyber-muted" />
            <span className="text-cyber-muted">Start Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="rounded-lg bg-cyber-bg border border-cyber-border px-2.5 py-1 text-xs text-white focus:border-cyber-cyan focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-cyber-muted" />
            <span className="text-cyber-muted">End Date:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="rounded-lg bg-cyber-bg border border-cyber-border px-2.5 py-1 text-xs text-white focus:border-cyber-cyan focus:outline-none transition"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-cyber-cyan hover:underline text-[11px] font-semibold"
            >
              Clear Date Filters
            </button>
          )}
        </div>
      </div>

      {/* Queue Data Table */}
      <div className="bg-cyber-panel border border-cyber-border rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cyber-border text-left">
            <thead className="bg-cyber-bg/50">
              <tr>
                <th 
                  scope="col" 
                  onClick={() => handleSort('severity')}
                  className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-cyber-muted cursor-pointer hover:text-white transition select-none"
                >
                  <div className="flex items-center gap-1">
                    Severity
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  scope="col"
                  onClick={() => handleSort('title')}
                  className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-cyber-muted cursor-pointer hover:text-white transition select-none"
                >
                  <div className="flex items-center gap-1">
                    Incident Title / Category
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-cyber-muted">Source IP ➔ Destination IP</th>
                <th scope="col" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-cyber-muted">Assignee</th>
                <th 
                  scope="col" 
                  onClick={() => handleSort('status')}
                  className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-cyber-muted cursor-pointer hover:text-white transition select-none"
                >
                  <div className="flex items-center gap-1">
                    Status
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  scope="col" 
                  onClick={() => handleSort('createdAt')}
                  className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-cyber-muted cursor-pointer hover:text-white transition select-none"
                >
                  <div className="flex items-center gap-1">
                    Created Date
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-cyber-muted text-right">Triage</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-cyber-border">
              {paginatedIncidents.map((inc) => (
                <tr 
                  key={inc.id} 
                  onClick={(e) => handleRowClick(inc.id, e)}
                  className="hover:bg-cyber-bg/30 transition-colors group cursor-pointer"
                >
                  {/* Severity */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${severityColors[inc.severity]}`}>
                      {inc.severity}
                    </span>
                  </td>

                  {/* Title & Category */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-white group-hover:text-cyber-cyan transition-colors truncate max-w-xs sm:max-w-md">
                      {inc.title}
                    </div>
                    <span className="text-[10px] text-cyber-muted font-mono uppercase tracking-wider block mt-0.5">
                      {inc.category} {inc.assets.length > 0 ? `| Host: ${inc.assets[0].hostname}` : ''}
                    </span>
                  </td>

                  {/* IP Addresses */}
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-cyber-muted">
                    {inc.sourceIp ? (
                      <span className="text-white">{inc.sourceIp}</span>
                    ) : (
                      'N/A'
                    )}
                    <span className="mx-2 text-cyber-muted/50">➔</span>
                    {inc.destIp ? (
                      <span className="text-white">{inc.destIp}</span>
                    ) : (
                      'N/A'
                    )}
                  </td>

                  {/* Assignee */}
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-white">
                    {inc.assignedTo ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-cyber-bg flex items-center justify-center text-[10px] text-cyber-cyan font-bold border border-cyber-cyan/15">
                          {inc.assignedTo.name.charAt(0)}
                        </div>
                        <span>{inc.assignedTo.name}</span>
                      </div>
                    ) : (
                      <span className="text-cyber-muted italic">Unassigned</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[inc.status]}`}>
                      {inc.status}
                    </span>
                  </td>

                  {/* Created Date */}
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-cyber-muted font-mono">
                    {new Date(inc.createdAt).toLocaleDateString()} {new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>

                  {/* Action Link */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link
                      href={`/dashboard/incidents/${inc.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-cyber-cyan hover:text-cyber-cyan/80 transition"
                    >
                      Investigate
                      <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </td>
                </tr>
              ))}

              {paginatedIncidents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-mono text-cyber-muted">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-cyber-cyan" />
                        Fetching active queue...
                      </span>
                    ) : (
                      'No incidents match the selected threat filters.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {processedIncidents.length > itemsPerPage && (
          <div className="bg-cyber-bg/40 border-t border-cyber-border px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-cyber-muted">
              Showing <span className="font-bold text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-bold text-white">
                {Math.min(currentPage * itemsPerPage, processedIncidents.length)}
              </span>{' '}
              of <span className="font-bold text-white">{processedIncidents.length}</span> threats
            </span>

            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1 rounded border border-cyber-border bg-cyber-panel text-xs text-cyber-muted hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1 rounded border border-cyber-border bg-cyber-panel text-xs text-cyber-muted hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IncidentQueuePage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] items-center justify-center">
        <RefreshCw className="h-10 w-10 text-cyber-cyan animate-spin" />
      </div>
    }>
      <IncidentQueueContent />
    </Suspense>
  );
}
