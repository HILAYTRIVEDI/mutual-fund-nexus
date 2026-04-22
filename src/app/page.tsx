'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import {
  ShieldCheck,
  TrendingUp,
  PiggyBank,
  BarChart3,
  ArrowRight,
  Users,
  Bell,
  Calculator,
  ChevronRight,
} from 'lucide-react';

export default function LandingPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // If already logged in, redirect to appropriate dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'admin') {
        router.replace('/admin-dashboard');
      } else {
        router.replace('/client-dashboard');
      }
    }
  }, [user, isAuthenticated, isLoading, router]);

  // Show spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If authenticated, show spinner while redirecting
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: TrendingUp,
      title: 'Portfolio Tracking',
      description: 'Real-time NAV updates and comprehensive portfolio analytics with P&L tracking.',
    },
    {
      icon: PiggyBank,
      title: 'SIP Management',
      description: 'Automated SIP execution with step-up support, reminders, and detailed history.',
    },
    {
      icon: Users,
      title: 'Client Management',
      description: 'Manage multiple client portfolios, KYC status, and communications in one place.',
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'XIRR calculations, tax-adjusted returns, and fund comparison tools.',
    },
    {
      icon: Bell,
      title: 'Smart Alerts',
      description: 'Automated SIP reminders, execution notifications, and market updates via email.',
    },
    {
      icon: Calculator,
      title: 'Investment Calculators',
      description: 'SIP, Lumpsum, and Step-up SIP calculators to plan your investments.',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-x-hidden">
      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-30%] left-[-15%] w-[700px] h-[700px] rounded-full bg-[var(--accent-gold)]/8 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[var(--accent-blue)]/8 blur-[120px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-[var(--accent-mint)]/5 blur-[80px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 lg:px-20 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-blue)] rounded-xl flex items-center justify-center shadow-lg shadow-[var(--accent-gold)]/20">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">RuaCapital</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-primary)] rounded-xl hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] transition-all duration-200"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-blue)] rounded-xl hover:opacity-90 transition-opacity duration-200 shadow-md shadow-[var(--accent-gold)]/20"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 md:px-12 lg:px-20 pt-16 md:pt-24 pb-20 md:pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-[var(--border-primary)] bg-[var(--bg-card)] text-xs font-medium text-[var(--text-secondary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-mint)] animate-pulse" />
            Trusted by Financial Advisors
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
            Smart Mutual Fund{' '}
            <span className="bg-gradient-to-r from-[var(--accent-gold)] via-[var(--accent-blue)] to-[var(--accent-mint)] bg-clip-text text-transparent">
              Management
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            The premium dashboard for financial advisors. Track portfolios, automate SIPs,
            manage clients, and grow wealth — all in one beautifully designed platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="group flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-blue)] rounded-xl hover:opacity-90 transition-all duration-200 shadow-lg shadow-[var(--accent-gold)]/25"
            >
              Start Managing
              <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link
              href="#features"
              className="flex items-center gap-2 px-8 py-3.5 text-base font-medium text-[var(--text-primary)] border border-[var(--border-primary)] rounded-xl hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] transition-all duration-200"
            >
              Explore Features
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 md:gap-8 mt-16 md:mt-20 max-w-lg mx-auto">
            {[
              { value: '500+', label: 'Mutual Funds' },
              { value: 'Live', label: 'NAV Updates' },
              { value: '100%', label: 'Automated SIPs' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-[var(--accent-gold)]">{stat.value}</div>
                <div className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">
              A complete toolkit for managing mutual fund investments and client relationships.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card rounded-2xl p-6 hover:border-[var(--border-hover)] transition-all duration-300 group"
              >
                <div className="w-11 h-11 rounded-xl bg-[var(--accent-gold)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--accent-gold)]/15 transition-colors duration-300">
                  <feature.icon size={22} className="text-[var(--accent-gold)]" />
                </div>
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-3xl mx-auto">
          <div className="glass-card rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            {/* Glow behind CTA */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              <div className="absolute top-[-50%] left-[10%] w-[400px] h-[400px] rounded-full bg-[var(--accent-gold)]/10 blur-[80px]" />
            </div>

            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-[var(--text-secondary)] text-base md:text-lg mb-8 max-w-lg mx-auto">
                Join RuaCapital and take control of your mutual fund portfolio with professional-grade tools.
              </p>
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-blue)] rounded-xl hover:opacity-90 transition-all duration-200 shadow-lg shadow-[var(--accent-gold)]/25"
              >
                Create Your Account
                <ChevronRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border-primary)] px-6 md:px-12 lg:px-20 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-blue)] rounded-lg flex items-center justify-center">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold">RuaCapital</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} RuaCapital. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
