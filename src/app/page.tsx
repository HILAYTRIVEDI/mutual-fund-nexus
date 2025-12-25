'use client';

import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import AssetChartCard from '@/components/AssetChartCard';
import DistributionCard from '@/components/DistributionCard';
import PortfolioCard from '@/components/PortfolioCard';
import MarketSnapshot from '@/components/MarketSnapshot';
import MarketIndicesTracker from '@/components/MarketIndicesTracker';
import ActivitySection from '@/components/ActivitySection';
import StakingCard from '@/components/StakingCard';
import MarketNewsCard from '@/components/MarketNewsCard';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 flex gap-6 transition-colors duration-300">
      {/* Main Content Area - Left Side */}
      <main className="flex-1">
        {/* Header with Quick Stats, Theme Toggle, Notifications */}
        <DashboardHeader
          title="Dashboard"
          subtitle="Welcome back! Here's your mutual fund portfolio overview."
        />

        {/* Bento Grid Layout */}
        <div className="space-y-4">
          {/* Row 1: Asset Chart + Distribution */}
          <div className="grid grid-cols-3 gap-4">
            <AssetChartCard />
            <DistributionCard />
          </div>

          {/* Row 2: Top Holdings (Full Width) */}
          <PortfolioCard />

          {/* Row 3: Market Indices (Full Width) */}
          <MarketIndicesTracker />

          {/* Row 4: Top Performing Funds (Full Width) */}
          <MarketSnapshot />

          {/* Row 5: Activity + SIPs */}
          <div className="grid grid-cols-2 gap-4">
            <ActivitySection />
            <StakingCard />
          </div>

          {/* Row 6: Market News (Full Width) */}
          <MarketNewsCard />
        </div>
      </main>

      {/* Sidebar - Right Side */}
      <Sidebar />
    </div>
  );
}


