'use client';

import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import AssetChartCard from '@/components/AssetChartCard';
import DistributionCard from '@/components/DistributionCard';
import PortfolioCard from '@/components/PortfolioCard';
import PendingSettlementsCard from '@/components/PendingSettlementsCard';

import ActivitySection from '@/components/ActivitySection';
import StakingCard from '@/components/StakingCard';

import MonthlySIPCard from '@/components/MonthlySIPCard';

export default function Home() {
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
          {/* Row 1: Asset Chart + Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <AssetChartCard />
            <DistributionCard />
          </div>

          {/* Pending Settlements (Only visible if active items exist) */}
          <PendingSettlementsCard />

          {/* Row 2: Top Holdings (Full Width) */}
          <PortfolioCard />



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
