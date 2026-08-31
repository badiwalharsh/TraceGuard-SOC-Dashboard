'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle, Loader } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cyber-bg px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1d253d_1px,transparent_1px),linear-gradient(to_bottom,#1d253d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-cyber-panel border border-cyber-cyan/30 text-cyber-cyan glow-cyan mb-3">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            TraceGuard <span className="text-cyber-cyan font-light">SOC</span>
          </h1>
          <p className="mt-2 text-sm text-cyber-muted">
            Incident Management & Threat Intelligence Dashboard
          </p>
        </div>

        <div className="bg-cyber-panel border border-cyber-border rounded-xl p-8 shadow-2xl relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyber-cyan via-cyber-blue to-cyber-cyan rounded-t-xl" />
          
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-cyber-red/10 border border-cyber-red/30 p-3 text-xs text-cyber-red">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="username" className="text-xs font-semibold text-cyber-muted uppercase tracking-wider">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-4 py-2.5 text-sm text-white placeholder-cyber-muted/50 focus:border-cyber-cyan focus:outline-none transition"
                placeholder="e.g. analyst"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-semibold text-cyber-muted uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-cyber-bg border border-cyber-border px-4 py-2.5 text-sm text-white placeholder-cyber-muted/50 focus:border-cyber-cyan focus:outline-none transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-cyber-blue hover:bg-cyber-blue/90 focus:outline-none transition shadow-lg shadow-cyber-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader className="animate-spin h-5 w-5 mr-2" />
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-cyber-border text-center text-[11px] text-cyber-muted space-y-1">
            <p>Fictional Seed Credentials for Triage Testing:</p>
            <p className="font-mono text-cyber-cyan">Analyst: analyst / AnalystPassword2026!</p>
            <p className="font-mono text-cyber-amber">Admin: admin / AdminPassword2026!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
