import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, 
  LayoutDashboard, 
  AlertTriangle, 
  BookOpen, 
  Server, 
  Upload, 
  Settings, 
  LogOut, 
  User as UserIcon,
  HardDrive
} from 'lucide-react';
import React from 'react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Inject a server action for logging out to keep logic clean and secure
  const handleLogout = async () => {
    'use server';
    // Import session actions dynamically inside server actions
    const { clearSession } = await import('@/lib/auth/session');
    await clearSession();
    redirect('/login');
  };

  const navLinks = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/incidents', label: 'Incident Queue', icon: AlertTriangle },
    { href: '/dashboard/rules', label: 'Detection Rules', icon: BookOpen },
    { href: '/dashboard/assets', label: 'Asset Inventory', icon: Server },
    { href: '/dashboard/import', label: 'Alert Import', icon: Upload },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-cyber-bg">
      {/* Sidebar navigation */}
      <aside className="w-64 border-r border-cyber-border bg-cyber-panel flex flex-col fixed h-full z-20">
        {/* Brand header */}
        <div className="h-16 px-6 border-b border-cyber-border flex items-center gap-3">
          <Shield className="h-6 w-6 text-cyber-cyan glow-cyan" />
          <span className="font-extrabold text-lg text-white tracking-wide">
            TraceGuard <span className="text-cyber-cyan font-light">SOC</span>
          </span>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-cyber-border flex items-center gap-3 bg-cyber-bg/50">
          <div className="h-9 w-9 rounded-lg bg-cyber-border flex items-center justify-center text-cyber-cyan border border-cyber-cyan/20">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-xs font-semibold text-white truncate">{session.name}</h4>
            <span className="text-[10px] text-cyber-muted font-mono uppercase tracking-wider block">
              {session.role}
            </span>
          </div>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-cyber-muted hover:text-white hover:bg-cyber-border transition-colors group"
              >
                <Icon className="h-4 w-4 text-cyber-muted group-hover:text-cyber-cyan transition-colors" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout button form */}
        <div className="p-4 border-t border-cyber-border">
          <form action={handleLogout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-cyber-muted hover:text-cyber-red hover:bg-cyber-red/10 border border-transparent hover:border-cyber-red/20 transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col">
        {/* Top Header */}
        <header className="h-16 border-b border-cyber-border bg-cyber-panel px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-cyber-muted" />
            <span className="text-xs font-mono text-cyber-muted uppercase tracking-wider">
              SOC NODE STATUS:
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyber-green/10 text-cyber-green border border-cyber-green/20">
              <span className="h-1.5 w-1.5 rounded-full bg-cyber-green animate-pulse" />
              ONLINE & PROTECTING
            </span>
          </div>
          
          <div className="text-xs text-cyber-muted font-mono">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        </header>

        {/* Page children container */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
