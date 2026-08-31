'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ShieldAlert, Loader } from 'lucide-react';

interface Asset {
  id: string;
  hostname: string;
  ipAddress: string;
}

interface Rule {
  id: string;
  name: string;
}

export default function CreateIncidentPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [category, setCategory] = useState('');
  const [sourceIp, setSourceIp] = useState('');
  const [destIp, setDestIp] = useState('');
  const [assetId, setAssetId] = useState('');
  const [ruleId, setRuleId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadFormOptions = async () => {
      try {
        const [assetRes, ruleRes] = await Promise.all([
          fetch('/api/assets'),
          fetch('/api/rules'),
        ]);

        if (assetRes.ok) {
          const assetData = await assetRes.ok ? await assetRes.json() : { assets: [] };
          setAssets(assetData.assets || []);
        }
        if (ruleRes.ok) {
          const ruleData = await ruleRes.json();
          setRules(ruleData.rules || []);
        }
      } catch (err) {
        console.error('Failed to load assets/rules:', err);
      } finally {
        setFetching(false);
      }
    };
    loadFormOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          severity,
          category,
          sourceIp: sourceIp || null,
          destIp: destIp || null,
          assetId: assetId || null,
          ruleId: ruleId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create incident');
      }

      router.push('/dashboard/incidents');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader className="animate-spin h-5 w-5 text-cyber-cyan" />
          <span className="text-sm font-mono text-cyber-muted">Preparing Incident Schema...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/incidents"
          className="inline-flex items-center gap-1 text-xs text-cyber-muted hover:text-white transition"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Incident Queue
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-cyber-blue/10 border border-cyber-blue/20 text-cyber-blue flex items-center justify-center">
          <ShieldAlert className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Create Manual Incident</h2>
          <p className="text-xs text-cyber-muted">Register a custom threat scenario inside the SOC registry.</p>
        </div>
      </div>

      <div className="bg-cyber-panel border border-cyber-border rounded-xl p-6 relative">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-cyber-red/10 border border-cyber-red/35 text-cyber-red rounded-lg p-3 text-xs">
              {error}
            </div>
          )}

          {/* Form grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-cyber-muted uppercase tracking-wider block">Incident Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Suspicious PowerShell Ingress"
                className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-4 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-cyber-muted uppercase tracking-wider block">Description & Summary</label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe details of the alert logs, affected systems, and indicators of compromise..."
                className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-4 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-cyber-muted uppercase tracking-wider block">Severity</label>
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
              <label className="text-xs font-semibold text-cyber-muted uppercase tracking-wider block">Threat Category</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Persistence, Exfiltration"
                className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-4 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-cyber-muted uppercase tracking-wider block">Source IP (IPv4)</label>
              <input
                type="text"
                value={sourceIp}
                onChange={(e) => setSourceIp(e.target.value)}
                placeholder="e.g. 192.168.1.50"
                className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-4 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-cyber-muted uppercase tracking-wider block">Destination IP (IPv4)</label>
              <input
                type="text"
                value={destIp}
                onChange={(e) => setDestIp(e.target.value)}
                placeholder="e.g. 10.0.2.15"
                className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-4 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-cyber-muted uppercase tracking-wider block">Associated Host Asset</label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white focus:border-cyber-cyan focus:outline-none transition"
              >
                <option value="">None / Unassociated</option>
                {assets.map(asset => (
                  <option key={asset.id} value={asset.id}>{asset.hostname} ({asset.ipAddress})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-cyber-muted uppercase tracking-wider block">Detection Trigger Rule</label>
              <select
                value={ruleId}
                onChange={(e) => setRuleId(e.target.value)}
                className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white focus:border-cyber-cyan focus:outline-none transition"
              >
                <option value="">None / Custom Trigger</option>
                {rules.map(rule => (
                  <option key={rule.id} value={rule.id}>{rule.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-cyber-border">
            <Link
              href="/dashboard/incidents"
              className="px-4 py-2 rounded-lg border border-cyber-border text-xs text-cyber-muted hover:text-white transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-cyber-blue hover:bg-cyber-blue/90 text-white font-semibold text-xs transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Register Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
