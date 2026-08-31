'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  ShieldAlert, 
  Activity, 
  Terminal, 
  Server, 
  Clock, 
  FileText,
  Send,
  User as UserIcon,
  CheckCircle,
  FileCode,
  Download,
  Printer,
  Trash2,
  AlertCircle,
  Loader,
  X,
  History
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  eventTime: string;
  title: string;
  description: string;
  source: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    username: string;
    role: string;
  } | null;
}

interface Asset {
  id: string;
  hostname: string;
  ipAddress: string;
  assetType: string;
  owner: string;
  criticality: string;
  os: string;
  location: string;
}

interface Rule {
  id: string;
  name: string;
  mitreAttack: string;
  description: string;
  query: string;
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string } | null;
}

interface IncidentDetail {
  id: string;
  title: string;
  description: string;
  status: 'NEW' | 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  sourceIp: string | null;
  destIp: string | null;
  createdAt: string;
  rule: Rule | null;
  assignedTo: {
    id: string;
    name: string;
    username: string;
    role: string;
  } | null;
  timelineEvents: TimelineEvent[];
  notes: Note[];
  assets: Asset[];
}

interface UserOptions {
  id: string;
  name: string;
  role: string;
}

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<IncidentDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analysts, setAnalysts] = useState<UserOptions[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Interactive modal state for timeline event details
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  // Note Form State
  const [noteContent, setNoteContent] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Dropdown States
  const [statusVal, setStatusVal] = useState<string>('');
  const [severityVal, setSeverityVal] = useState<string>('');
  const [assigneeVal, setAssigneeVal] = useState<string>('');
  const [updatingParams, setUpdatingParams] = useState(false);

  // Report State
  const [generatingReport, setGeneratingReport] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadDetails = async () => {
    try {
      // 1. Fetch Current Logged-in User
      const userRes = await fetch('/api/auth/me');
      let currentSessionUser = null;
      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUser(userData.user);
        currentSessionUser = userData.user;
      }

      // 2. Fetch Incident Detail
      const res = await fetch(`/api/incidents/${id}`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Forbidden. Access to this incident is restricted.');
        }
        throw new Error('Incident not found');
      }
      const details = await res.json();
      setData(details.incident);
      setStatusVal(details.incident.status);
      setSeverityVal(details.incident.severity);
      setAssigneeVal(details.incident.assignedTo?.id || 'unassigned');

      // 3. Load centralized audit logs and filter locally for this incident
      const auditRes = await fetch('/api/audit-logs');
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        const logs = (auditData.auditLogs || []) as AuditLog[];
        setAuditLogs(logs.filter(log => log.details.includes(id) || log.details.includes(details.incident.title)));
      }

      // 4. Fetch dynamic list of users/analysts for assignment
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAnalysts(usersData.users || []);
      }

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to resolve incident payload.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const handleParamChange = async (type: 'status' | 'severity' | 'assignee', value: string) => {
    setUpdatingParams(true);
    try {
      const payload: Record<string, string | null> = {};
      if (type === 'status') {
        payload.status = value;
        setStatusVal(value);
      }
      if (type === 'severity') {
        payload.severity = value;
        setSeverityVal(value);
      }
      if (type === 'assignee') {
        payload.assignedToId = value === 'unassigned' ? null : value;
        setAssigneeVal(value);
      }

      const res = await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update incident metrics');
      }
      
      await loadDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error updating incident details.');
      // Revert select state
      if (data) {
        setStatusVal(data.status);
        setSeverityVal(data.severity);
        setAssigneeVal(data.assignedTo?.id || 'unassigned');
      }
    } finally {
      setUpdatingParams(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setNoteSubmitting(true);
    try {
      const res = await fetch(`/api/incidents/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save note');
      }

      setNoteContent('');
      await loadDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save note.');
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleDownloadReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: id }),
      });

      if (!res.ok) throw new Error('Failed to generate report JSON');
      const blob = await res.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Incident-Report-${id}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Failed to download investigation report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handlePrintReport = () => {
    window.open(`/api/reports/generate?incidentId=${id}&format=html`, '_blank');
  };

  const handleDeleteIncident = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this incident and all of its notes & timeline events? This action is irreversible.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete incident.');
      }

      router.push('/dashboard/incidents');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete incident.');
      setDeleting(false);
    }
  };

  const recommendations = {
    'Command and Control': [
      'Isolate the target machine immediately from core VLAN to prevent threat spread.',
      'Check firewall/DNS egress logs for auxiliary outbound connections.',
      'Capture host process listing and dump memory of suspicious binaries.'
    ],
    'Credential Access': [
      'Revoke current access tokens for the compromised credential immediately.',
      'Force password reset across Active Directory and linked accounts.',
      'Verify target IP log geo-locations against employee work registries.'
    ],
    'Persistence': [
      'Remove unauthorized cron/scheduled tasks or user accounts from the systems.',
      'Analyze group additions logs in AD to isolate the source administrator compromise.',
      'Audit local registry run keys and startup paths.'
    ],
    'Initial Access': [
      'Analyze firewall/WAF trigger rules to check if query payloads were dropped.',
      'Block source scanning IP ranges in edge gateway router tables.',
      'Isolate and sweep target web application source files for web shells.'
    ]
  };

  const threatRecs = recommendations[data?.category as keyof typeof recommendations] || [
    'Sweep host processes for suspicious scripts or memory injections.',
    'Verify host file system access logs around alert timestamp.'
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader className="animate-spin h-8 w-8 text-cyber-cyan" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-cyber-red/10 border border-cyber-red/30 text-cyber-red rounded-lg p-4 max-w-md mx-auto text-center flex flex-col items-center gap-3">
        <AlertCircle className="h-10 w-10 animate-bounce" />
        <div>
          <h3 className="font-bold text-sm">Triage Warning</h3>
          <p className="text-xs text-cyber-muted mt-1">{errorMessage || 'Incident not found.'}</p>
        </div>
        <Link href="/dashboard/incidents" className="px-4 py-2 bg-cyber-panel text-white border border-cyber-border rounded text-xs">
          Return to Queue
        </Link>
      </div>
    );
  }

  // Client-side permissions check for inputs
  // Analysts can only modify if they are assigned to this incident, or if it is unassigned.
  // Admins can always modify.
  const isTriageDisabled = updatingParams || (
    currentUser?.role !== 'ADMIN' &&
    data.assignedTo?.id !== currentUser?.id &&
    data.assignedTo?.id !== undefined &&
    data.assignedTo !== null
  );

  // Notes are disabled for Analysts if they aren't assigned to this incident
  const isNotesDisabled = noteSubmitting || (
    currentUser?.role !== 'ADMIN' &&
    data.assignedTo?.id !== currentUser?.id
  );

  return (
    <div className="space-y-6">
      {/* Back to queue link */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/incidents"
          className="inline-flex items-center gap-1 text-xs text-cyber-muted hover:text-white transition"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Incident Queue
        </Link>
        
        {currentUser?.role === 'ADMIN' && (
          <button
            onClick={handleDeleteIncident}
            disabled={deleting}
            className="px-3 py-1.5 rounded-lg border border-cyber-red/30 hover:border-cyber-red text-cyber-red hover:bg-cyber-red/10 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            {deleting ? (
              <Loader className="animate-spin h-3.5 w-3.5" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            DELETE INCIDENT
          </button>
        )}
      </div>

      {/* Title Block Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyber-border pb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${data.severity === 'CRITICAL' ? 'text-white bg-cyber-red border-cyber-red glow-red' : 'text-cyber-red bg-cyber-red/10 border-cyber-red/20'}`}>
              {data.severity}
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight sm:text-2xl">{data.title}</h2>
          </div>
          <span className="text-xs text-cyber-muted font-mono uppercase tracking-wider block mt-1">
            Category: {data.category} | Created {new Date(data.createdAt).toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintReport}
            className="px-4 py-2 rounded-lg bg-cyber-panel border border-cyber-border hover:border-cyber-cyan hover:text-cyber-cyan text-xs font-semibold text-white flex items-center gap-2 transition"
          >
            <Printer className="h-3.5 w-3.5" />
            Print HTML Report
          </button>

          <button
            onClick={handleDownloadReport}
            disabled={generatingReport}
            className="px-4 py-2 rounded-lg bg-cyber-panel border border-cyber-border hover:border-cyber-cyan hover:text-cyber-cyan text-xs font-semibold text-white flex items-center gap-2 transition disabled:opacity-50"
          >
            {generatingReport ? (
              <Loader className="animate-spin h-3.5 w-3.5" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            JSON Report
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <div className="cyber-card p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 mb-4 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-cyber-cyan" />
              Incident Investigation details
            </h3>
            
            <p className="text-sm text-cyber-text leading-relaxed whitespace-pre-wrap">{data.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-cyber-border text-xs font-mono">
              <div>
                <span className="text-cyber-muted block">Source IP Address</span>
                <span className="text-white font-bold">{data.sourceIp || 'N/A'}</span>
              </div>
              <div>
                <span className="text-cyber-muted block">Destination IP Address</span>
                <span className="text-white font-bold">{data.destIp || 'N/A'}</span>
              </div>
              {data.rule && (
                <div className="col-span-2 pt-2">
                  <span className="text-cyber-muted block">MITRE ATT&CK Mapping</span>
                  <span className="text-cyber-cyan font-bold">{data.rule.name} ({data.rule.mitreAttack})</span>
                </div>
              )}
            </div>
          </div>

          {/* Affected Assets */}
          <div className="cyber-card p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 mb-4 flex items-center gap-2">
              <Server className="h-4 w-4 text-cyber-cyan" />
              Affected Asset Inventory
            </h3>

            {data.assets.length === 0 ? (
              <p className="text-xs text-cyber-muted font-mono italic">No specific system assets linked to this incident.</p>
            ) : (
              <div className="space-y-4">
                {data.assets.map(asset => (
                  <div key={asset.id} className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-cyber-bg/40 p-4 border border-cyber-border rounded-lg">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-cyber-muted block">Hostname</span>
                      <span className="text-white font-bold">{asset.hostname}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-cyber-muted block">IP Address</span>
                      <span className="text-white font-mono">{asset.ipAddress}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-cyber-muted block">Criticality</span>
                      <span className={`font-bold ${asset.criticality === 'CRITICAL' || asset.criticality === 'HIGH' ? 'text-cyber-red' : 'text-cyber-amber'}`}>
                        {asset.criticality}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-cyber-muted block">OS Platform</span>
                      <span className="text-cyber-muted">{asset.os}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-cyber-muted block">System Owner</span>
                      <span className="text-cyber-muted">{asset.owner}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-cyber-muted block">Zone</span>
                      <span className="text-cyber-muted">{asset.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Remediation Recommendations */}
          <div className="cyber-card p-6 border-l-4 border-l-cyber-cyan">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-cyber-cyan" />
              Triage Remediation Recommendations
            </h3>
            
            <ul className="space-y-2 text-xs text-cyber-text">
              {threatRecs.map((rec, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyber-cyan mt-1.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Event Timeline */}
          <div className="cyber-card p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyber-cyan" />
              Incident Audit Timeline (Click events to inspect metadata)
            </h3>

            <div className="relative pl-6 border-l border-cyber-border space-y-6 mt-4">
              {data.timelineEvents.map((event) => (
                <div 
                  key={event.id} 
                  onClick={() => setSelectedEvent(event)}
                  className="relative cursor-pointer hover:bg-cyber-bg/20 p-2 rounded-lg transition group"
                >
                  {/* Timeline point */}
                  <span className="absolute -left-[39px] top-2.5 bg-cyber-panel border border-cyber-border rounded-full p-1 text-cyber-cyan group-hover:border-cyber-cyan transition">
                    <Clock className="h-3 w-3" />
                  </span>
                  
                  <div className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white group-hover:text-cyber-cyan transition-colors">{event.title}</span>
                      <span className="text-[9px] font-mono text-cyber-muted">
                        {new Date(event.eventTime).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-cyber-muted mt-1 leading-relaxed truncate">{event.description}</p>
                    <span className="text-[9px] font-mono text-cyber-cyan/60 uppercase tracking-wider mt-1 block">
                      Click to inspect raw logs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance History Audit Trail */}
          <div className="cyber-card p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 mb-4 flex items-center gap-2">
              <History className="h-4 w-4 text-cyber-cyan" />
              Compliance History Audit Trail
            </h3>
            
            <div className="divide-y divide-cyber-border">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex justify-between gap-4 text-xs font-mono">
                  <div>
                    <span className="text-cyber-cyan font-bold block uppercase">{log.action}</span>
                    <span className="text-cyber-text leading-relaxed mt-1 block">{log.details}</span>
                  </div>
                  <div className="text-right text-cyber-muted">
                    <span>{new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}</span>
                    {log.ipAddress && <span className="block text-[10px]">IP: {log.ipAddress}</span>}
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="py-4 text-center text-cyber-muted font-mono italic">
                  No explicit audit trail files associated.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Triage controls */}
          <div className="cyber-card p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyber-cyan" />
              Triage Control panel
            </h3>

            {/* Status Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Triage Status</label>
              <select
                value={statusVal}
                disabled={isTriageDisabled}
                onChange={(e) => handleParamChange('status', e.target.value)}
                className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white focus:border-cyber-cyan focus:outline-none transition disabled:opacity-40"
              >
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="CONTAINED">Contained</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Severity Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Alert Severity</label>
              <select
                value={severityVal}
                disabled={isTriageDisabled}
                onChange={(e) => handleParamChange('severity', e.target.value)}
                className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white focus:border-cyber-cyan focus:outline-none transition disabled:opacity-40"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Assignee Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Assigned Analyst</label>
              <select
                value={assigneeVal}
                disabled={isTriageDisabled}
                onChange={(e) => handleParamChange('assignee', e.target.value)}
                className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white focus:border-cyber-cyan focus:outline-none transition disabled:opacity-40"
              >
                <option value="unassigned">Unassigned</option>
                {analysts.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Mark as Resolved Shortcut Button */}
            {data.status !== 'RESOLVED' && data.status !== 'CLOSED' && (
              <button
                onClick={() => handleParamChange('status', 'RESOLVED')}
                disabled={isTriageDisabled}
                className="w-full py-2 bg-cyber-green hover:bg-cyber-green/90 text-cyber-bg font-extrabold text-xs rounded-lg transition disabled:opacity-40"
              >
                MARK AS RESOLVED
              </button>
            )}
          </div>

          {/* Notes */}
          <div className="cyber-card p-6 flex flex-col h-[500px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyber-cyan" />
              Analyst Investigation Notes
            </h3>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
              {data.notes.map(note => (
                <div key={note.id} className="bg-cyber-bg/40 border border-cyber-border rounded-lg p-3 text-xs">
                  <div className="flex justify-between items-center text-cyber-muted font-mono text-[9px] mb-1.5">
                    <span className="font-bold text-cyber-cyan">
                      {note.author ? note.author.name : 'System'}
                    </span>
                    <span>{new Date(note.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-white leading-relaxed">{note.content}</p>
                </div>
              ))}
              {data.notes.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-cyber-muted font-mono italic py-8">
                  No notes recorded yet.
                </div>
              )}
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-cyber-border">
              <textarea
                value={noteContent}
                disabled={isNotesDisabled}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
                placeholder={isNotesDisabled ? "Claim incident to record comments..." : "Add comments or logs details..."}
                className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white placeholder-cyber-muted/50 focus:border-cyber-cyan focus:outline-none transition resize-none disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={isNotesDisabled || !noteContent.trim()}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-cyber-blue hover:bg-cyber-blue/90 text-white font-semibold text-xs rounded-lg transition disabled:opacity-40"
              >
                {noteSubmitting ? (
                  <Loader className="animate-spin h-3.5 w-3.5" />
                ) : (
                  <>
                    <Send className="h-3 w-3" />
                    Save Analyst Note
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Interactive timeline event modal/panel */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="cyber-card w-full max-w-md p-6 relative bg-cyber-panel shadow-2xl">
            <button 
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-cyber-muted hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
            
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4 border-b border-cyber-border pb-2 flex items-center gap-2">
              <FileCode className="h-4 w-4 text-cyber-cyan" />
              Event Inspection Panel
            </h3>

            <div className="space-y-4 text-xs font-mono leading-relaxed">
              <div>
                <span className="text-cyber-muted block">Event Title:</span>
                <span className="text-white font-bold">{selectedEvent.title}</span>
              </div>

              <div>
                <span className="text-cyber-muted block">Timestamp:</span>
                <span className="text-white">{new Date(selectedEvent.eventTime).toString()}</span>
              </div>

              <div>
                <span className="text-cyber-muted block">Ingestion Source:</span>
                <span className="text-cyber-cyan uppercase">{selectedEvent.source}</span>
              </div>

              <div>
                <span className="text-cyber-muted block mb-1">Details / Raw logs:</span>
                <pre className="bg-cyber-bg border border-cyber-border rounded-lg p-3 max-h-48 overflow-y-auto text-[10px] text-white whitespace-pre-wrap">
                  {selectedEvent.description}
                </pre>
              </div>
            </div>
            
            <div className="pt-4 mt-6 border-t border-cyber-border flex justify-end">
              <button 
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-cyber-blue hover:bg-cyber-blue/90 text-white font-semibold text-xs rounded-lg transition"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
