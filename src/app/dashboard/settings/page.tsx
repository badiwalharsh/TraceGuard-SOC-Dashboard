'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  User as UserIcon, 
  Lock, 
  Clock, 
  CheckCircle2, 
  Loader, 
  RefreshCw 
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  details: string;
  ipAddress: string | null;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
}

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Profile settings state
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess(false);

      const profileRes = await fetch('/api/auth/me');
      if (profileRes.ok) {
        const data = await profileRes.json();
        setCurrentUser(data.user);
        setName(data.user?.name || '');
      }

      // Fetch user specific audit logs
      // Wait, we don't have a standalone audit log endpoint, but we can mock / load them or query them.
      // To satisfy visual compliance audit records:
      // Let's create a route for fetching current user audit logs, or mock it locally, or just load them if we had an API.
      // Let's write a simple endpoint or fetch all and filter client side.
      // Wait! We can filter the central logs. But wait, do we have an audit logs route?
      // In prisma seed, we seeded 2 audit logs.
      // Let's check: we can fetch audit logs from a mock or create `/api/audit-logs` endpoint.
      // Let's create `/api/audit-logs` endpoint since it will be extremely simple and adds high value!
      // Let's write it in this page, and we will create `/api/audit-logs/route.ts` next.
      const logsRes = await fetch('/api/audit-logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAuditLogs(logsData.auditLogs || []);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword && newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          newPassword: newPassword || undefined
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      
      // Reload profile
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !currentUser) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader className="animate-spin h-6 w-6 text-cyber-cyan" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Settings & Profile</h2>
        <p className="text-sm text-cyber-muted">Manage profile details and review analyst session compliance logs.</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card & Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="cyber-card p-6 relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-cyber-blue rounded-t-xl" />
            
            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 mb-6 flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-cyber-cyan" />
              Profile Details
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {error && (
                <div className="bg-cyber-red/10 border border-cyber-red/35 text-cyber-red rounded-lg p-3 text-xs">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-cyber-green/10 border border-cyber-green/35 text-cyber-green rounded-lg p-3 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Profile updated successfully.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username (Disabled) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Username</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.username || ''}
                    className="w-full rounded-lg bg-cyber-bg/50 border border-cyber-border px-3 py-2 text-xs text-cyber-muted focus:outline-none cursor-not-allowed"
                  />
                </div>

                {/* Role (Disabled) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Triage Role</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.role || ''}
                    className="w-full rounded-lg bg-cyber-bg/50 border border-cyber-border px-3 py-2 text-xs text-cyber-muted focus:outline-none cursor-not-allowed font-mono uppercase"
                  />
                </div>

                {/* Display Name */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Display Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. SOC Analyst Alice"
                    className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
                  />
                </div>

                {/* Change Password Header */}
                <div className="sm:col-span-2 pt-4 border-t border-cyber-border flex items-center gap-2 text-white">
                  <Lock className="h-4 w-4 text-cyber-cyan" />
                  <span className="text-xs font-bold uppercase tracking-wider">Change Password</span>
                </div>

                {/* New Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-cyber-blue hover:bg-cyber-blue/90 text-white font-semibold text-xs transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Update Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Audit Log column */}
        <div className="cyber-card p-6 flex flex-col h-[500px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-cyber-border pb-3 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyber-cyan" />
            Compliance Audit logs
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="bg-cyber-bg/40 border border-cyber-border rounded-lg p-3 text-[11px] leading-relaxed">
                <div className="flex justify-between items-center text-[10px] font-mono text-cyber-cyan mb-1 font-bold">
                  <span>{log.action}</span>
                  <span className="text-cyber-muted font-normal">{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-white">{log.details}</p>
                {log.ipAddress && (
                  <span className="text-[9px] font-mono text-cyber-muted block mt-1">IP: {log.ipAddress}</span>
                )}
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-xs text-cyber-muted font-mono italic py-8">
                No activity logs.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
