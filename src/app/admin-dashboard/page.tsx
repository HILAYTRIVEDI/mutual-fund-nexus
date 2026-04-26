'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import AssetChartCard from '@/components/AssetChartCard';
import DistributionCard from '@/components/DistributionCard';
import PortfolioCard from '@/components/PortfolioCard';

import ActivitySection from '@/components/ActivitySection';
import StakingCard from '@/components/StakingCard';

import MonthlySIPCard from '@/components/MonthlySIPCard';
import MarketIndicesTracker from '@/components/MarketIndicesTracker';
import MarketSnapshot from '@/components/MarketSnapshot';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') {
      router.replace('/client-dashboard');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') {
      router.replace('/client-dashboard');
    }
  }, [isLoading, user, router]);

  if (isLoading || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 transition-colors duration-300">
      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        {/* Header with Quick Stats, Theme Toggle, Notifications */}
        <DashboardHeader
          title="Dashboard"
          subtitle="Welcome back! Here's your mutual fund portfolio overview."
        />

        {/* Bento Grid Layout */}
        <div className="space-y-4">
          {/* Row 0: Live Market Indices */}
          <MarketIndicesTracker />

          {/* Row 1: Asset Chart + Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <AssetChartCard />
            <DistributionCard />
          </div>

          {/* Row 2: Top Holdings (Full Width) */}
          <PortfolioCard />

          {/* Row 3: Top Performing Holdings */}
          <MarketSnapshot />

          {/* Row 4: Monthly SIP + Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MonthlySIPCard />
            <ActivitySection />
          </div>

          {/* Row 5: Upcoming SIPs (Full Width) */}
          <StakingCard />

        </div>
      </main>

      {/* Sidebar - Right Side (Desktop Only - Mobile uses drawer) */}
      <Sidebar />
    </div>
  );
}
