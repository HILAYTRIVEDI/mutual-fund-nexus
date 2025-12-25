import Sidebar from '@/components/Sidebar';
import AssetChartCard from '@/components/AssetChartCard';
import DistributionCard from '@/components/DistributionCard';
import PortfolioCard from '@/components/PortfolioCard';
import MarketSnapshot from '@/components/MarketSnapshot';
import ActivitySection from '@/components/ActivitySection';
import StakingCard from '@/components/StakingCard';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B0E11] text-white p-6 flex gap-6">
      {/* Main Content Area - Left Side */}
      <main className="flex-1">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-[#9CA3AF] text-sm">Welcome back, John! Here&apos;s your portfolio overview.</p>
        </header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-4 gap-4">
          {/* Row 1 */}
          <AssetChartCard />
          <DistributionCard />
          <PortfolioCard />

          {/* Row 2 */}
          <div className="col-span-2 space-y-4">
            <MarketSnapshot />
            <ActivitySection />
          </div>
          <div className="col-span-2">
            <StakingCard />
          </div>
        </div>
      </main>

      {/* Sidebar - Right Side */}
      <Sidebar />
    </div>
  );
}
