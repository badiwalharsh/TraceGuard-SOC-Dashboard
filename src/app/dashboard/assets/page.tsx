'use client';

import { useState, useEffect } from 'react';
import { 
  Server, 
  Search, 
  ShieldAlert, 
  Plus, 
  Loader, 
  RefreshCw 
} from 'lucide-react';

interface Asset {
  id: string;
  hostname: string;
  ipAddress: string;
  assetType: 'WORKSTATION' | 'SERVER' | 'DATABASE' | 'CLOUD_VM' | 'NET_DEVICE';
  owner: string;
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  os: string;
  location: string;
}

interface User {
  role: 'ADMIN' | 'ANALYST';
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');

  // Add Asset form states
  const [showForm, setShowForm] = useState(false);
  const [hostname, setHostname] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [assetType, setAssetType] = useState<'WORKSTATION' | 'SERVER' | 'DATABASE' | 'CLOUD_VM' | 'NET_DEVICE'>('SERVER');
  const [owner, setOwner] = useState('');
  const [criticality, setCriticality] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [os, setOs] = useState('');
  const [location, setLocation] = useState('');
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

      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname, ipAddress, assetType, owner, criticality, os, location }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save asset registry');
      }

      // Reset form and reload
      setHostname('');
      setIpAddress('');
      setOwner('');
      setOs('');
      setLocation('');
      setShowForm(false);
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        asset.hostname.toLowerCase().includes(q) ||
        asset.ipAddress.includes(q) ||
        asset.owner.toLowerCase().includes(q) ||
        asset.os.toLowerCase().includes(q) ||
        asset.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const criticalityColors = {
    LOW: 'text-cyber-muted bg-cyber-muted/10 border-cyber-muted/20',
    MEDIUM: 'text-cyber-amber bg-cyber-amber/10 border-cyber-amber/20',
    HIGH: 'text-cyber-red bg-cyber-red/10 border-cyber-red/20',
    CRITICAL: 'text-white bg-cyber-red border-cyber-red glow-red font-bold'
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Asset Inventory</h2>
          <p className="text-sm text-cyber-muted">Inspect system assets, critical servers, workstations, and OS configurations.</p>
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
              {showForm ? 'Close Editor' : 'Register Asset'}
            </button>
          )}
        </div>
      </div>

      {/* Add Asset Form Panel */}
      {showForm && user?.role === 'ADMIN' && (
        <div className="bg-cyber-panel border border-cyber-border rounded-xl p-6 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyber-blue rounded-t-xl" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Register Asset Node</h3>
          
          <form onSubmit={handleAddAsset} className="space-y-4">
            {formError && (
              <div className="bg-cyber-red/10 border border-cyber-red/35 text-cyber-red rounded-lg p-3 text-xs">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Hostname</label>
                <input
                  type="text"
                  required
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  placeholder="e.g. prod-web-01"
                  className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">IP Address (IPv4)</label>
                <input
                  type="text"
                  required
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="e.g. 10.0.1.25"
                  className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Asset Type</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as any)}
                  className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white focus:border-cyber-cyan focus:outline-none transition"
                >
                  <option value="WORKSTATION">Workstation</option>
                  <option value="SERVER">Server</option>
                  <option value="DATABASE">Database</option>
                  <option value="CLOUD_VM">Cloud VM</option>
                  <option value="NET_DEVICE">Network Device</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">System Owner</label>
                <input
                  type="text"
                  required
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="e.g. IT Operations"
                  className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">Criticality</label>
                <select
                  value={criticality}
                  onChange={(e) => setCriticality(e.target.value as any)}
                  className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white focus:border-cyber-cyan focus:outline-none transition"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">OS Platform</label>
                <input
                  type="text"
                  required
                  value={os}
                  onChange={(e) => setOs(e.target.value)}
                  placeholder="e.g. Windows Server 2022"
                  className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
                />
              </div>

              <div className="space-y-1 md:col-span-2 lg:col-span-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-cyber-muted block">VLAN / location Zone</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Secure DB Zone, Corporate HQ Office"
                  className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-3 py-2 text-xs text-white placeholder-cyber-muted/40 focus:border-cyber-cyan focus:outline-none transition"
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
                {submitting ? 'Registering...' : 'Save Asset'}
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
          placeholder="Search hostname, IP, platform..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg bg-cyber-panel border border-cyber-border pl-10 pr-4 py-2.5 text-xs text-white placeholder-cyber-muted/50 focus:border-cyber-cyan focus:outline-none transition"
        />
      </div>

      {/* Asset Data Table */}
      <div className="bg-cyber-panel border border-cyber-border rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cyber-border text-left">
            <thead className="bg-cyber-bg/50">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-cyber-muted">Hostname</th>
                <th scope="col" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-cyber-muted">IP Address</th>
                <th scope="col" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-cyber-muted">Type</th>
                <th scope="col" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-cyber-muted">Criticality</th>
                <th scope="col" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-cyber-muted">Owner</th>
                <th scope="col" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-cyber-muted">OS / Platform</th>
                <th scope="col" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-cyber-muted">Zone</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-cyber-border">
              {filteredAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-cyber-bg/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-cyber-cyan" />
                      <span className="text-sm font-bold text-white">{asset.hostname}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-white">
                    {asset.ipAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-cyber-muted font-mono uppercase">
                    {asset.assetType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${criticalityColors[asset.criticality]}`}>
                      {asset.criticality}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-white">
                    {asset.owner}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-cyber-muted">
                    {asset.os}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-cyber-muted">
                    {asset.location}
                  </td>
                </tr>
              ))}

              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-mono text-cyber-muted">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-cyber-cyan" />
                        Fetching asset registry...
                      </span>
                    ) : (
                      'No assets registered matching query.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
