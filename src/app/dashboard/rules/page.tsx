'use client';

import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  ShieldAlert, 
  ToggleLeft, 
  ToggleRight, 
  Plus, 
  Loader, 
  RefreshCw 
} from 'lucide-react';

interface Rule {
  id: string;
  name: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  mitreAttack: string;
  query: string;
  enabled: boolean;
}

interface User {
  role: 'ADMIN' | 'ANALYST';
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  
  // Rule Creation form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [category, setCategory] = useState('');
  const [mitreAttack, setMitreAttack] = useState('');
  const [query, setQuery] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const userRes = await fetch('/api/auth/me');
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user);
      }

      const res = await fetch('/api/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (id: string) => {
    if (user?.role !== 'ADMIN') return;

    try {
      const res = await fetch(`/api/rules/${id}/toggle`, {
        method: 'POST',
      });
      if (res.ok) {
        setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to toggle rule state.');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, severity, category, mitreAttack, query }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save detection rule');
      }

      // Reset form and reload
      setName('');
      setDescription('');
      setCategory('');
      setMitreAttack('');
      setQuery('');
      setShowForm(false);
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRules = rules.filter(rule => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        rule.name.toLowerCase().includes(q) ||
        rule.description.toLowerCase().includes(q) ||
        rule.category.toLowerCase().includes(q) ||
        rule.mitreAttack.toLowerCase().includes(q) ||
        rule.query.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const severityColors = {
    LOW: 'text-cyber-muted bg-cyber-muted/10 border-cyber-muted/20',
    MEDIUM: 'text-cyber-amber bg-cyber-amber/10 border-cyber-amber/20',
    HIGH: 'text-cyber-red bg-cyber-red/10 border-cyber-red/20',
    CRITICAL: 'text-white bg-cyber-red border-cyber-red glow-red font-bold'
  };

  return (
    <div className="space-y-6">
      {/* Title section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Detection Rules Library</h2>
          <p className="text-sm text-cyber-muted">Inspect, enable, or construct search filters mapping to Mitre ATT&CK tactics.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            className="p-2.5 rounded-lg border border-cyber-border bg-cyber-panel text-cyber-muted hover:text-white transition flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2.5 rounded-lg bg-cyber-blue hover:bg-cyber-blue/90 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-lg shadow-cyber-blue/20"
            >
              <Plus className="h-4 w-4" />
              {showForm ? 'Close Editor' : 'New Rule'}
            </button>
          )}
        </div>
      </div>

      {/* Admin Create Rule Panel */}
      {showForm && user?.role === 'ADMIN' && (
        <div className="bg-cyber-panel border border-cyber-border rounded-xl p-6 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyber-blue rounded-t-xl" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Create Detection Rule</h3>
          
          <form onSubmit={handleCreateRule} className="space-y-4">
            {formError && (
              <div className="bg-cyber-red/10 border border-cyber-red/35 text-cyber-red rounded-lg p-3 text-xs">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Rule Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. LSASS Process Dump Detected"
                  className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Mitre ATT&CK ID</label>
                <input
                  type="text"
                  required
                  value={mitreAttack}
                  onChange={(e) => setMitreAttack(e.target.value)}
                  placeholder="e.g. T1003.001"
                  className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Description</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize the behavior matched by this detection trigger..."
                  className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white focus:border-cyber-cyan focus:outline-none transition"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Category</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Credential Access"
                  className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Detection Query Representation</label>
                <textarea
                  rows={2}
                  required
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. process_log | where name == 'rundll32.exe' and arguments matches 'comsvcs.dll'"
                  className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white font-mono placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-cyber-border">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-cyber-border text-xs text-cyber-muted hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-cyber-blue hover:bg-cyber-blue/90 text-white font-semibold text-xs transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Detection Rule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-cyber-muted" />
        <input
          type="text"
          placeholder="Search rule library..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg bg-cyber-panel border border-cyber-border pl-10 pr-4 py-2.5 text-xs text-white placeholder-cyber-muted/50 focus:border-cyber-cyan focus:outline-none transition"
        />
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRules.map(rule => (
          <div 
            key={rule.id} 
            className={`cyber-card p-6 flex flex-col justify-between border ${!rule.enabled ? 'opacity-55' : ''}`}
          >
            <div>
              {/* Header tags */}
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-semibold border ${severityColors[rule.severity]}`}>
                  {rule.severity}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-cyber-cyan font-mono">{rule.mitreAttack}</span>
                  {user?.role === 'ADMIN' ? (
                    <button
                      onClick={() => handleToggle(rule.id)}
                      className="text-cyber-muted hover:text-white transition"
                    >
                      {rule.enabled ? (
                        <ToggleRight className="h-5 w-5 text-cyber-cyan" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-cyber-muted" />
                      )}
                    </button>
                  ) : (
                    <span className="text-cyber-muted text-xs">
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>
              </div>

              {/* Title and description */}
              <h3 className="text-sm font-bold text-white group-hover:text-cyber-cyan transition-colors">
                {rule.name}
              </h3>
              <span className="text-[9px] font-mono text-cyber-muted uppercase tracking-wider block mt-0.5 mb-2">
                Category: {rule.category}
              </span>
              <p className="text-xs text-cyber-muted leading-relaxed mb-4">{rule.description}</p>
            </div>

            {/* Query logic display */}
            <div className="bg-cyber-bg/60 border border-cyber-border rounded-lg p-3">
              <span className="text-[9px] font-mono text-cyber-muted block mb-1 uppercase tracking-wider">Detection Logic</span>
              <code className="text-[11px] font-mono text-cyber-cyan block truncate">{rule.query}</code>
            </div>
          </div>
        ))}

        {filteredRules.length === 0 && (
          <div className="md:col-span-2 py-12 text-center text-xs font-mono text-cyber-muted">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="animate-spin h-4 w-4 text-cyber-cyan" />
                Loading detection triggers...
              </span>
            ) : (
              'No rules found matching query.'
            )}
          </div>
        )}
      </div>
    </div>
  );
}
