'use client';

import { useState } from 'react';
import { Search, Book, FileText, ExternalLink, PlayCircle, Clock, ChevronRight, Bookmark } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

interface Guide {
    id: string;
    title: string;
    description: string;
    category: string;
    duration: string;
    icon: React.ElementType;
    color: string;
    steps?: string[];
}

const guides: Guide[] = [
    {
        id: '1',
        title: 'Getting Started with MF Nexus',
        description: 'Learn the basics of the platform and set up your first client in minutes.',
        category: 'Beginner',
        duration: '5 min read',
        icon: Book,
        color: '#10B981',
        steps: [
            'Navigate to "Manage Clients" from the sidebar',
            'Enter client details (name, email, phone)',
            'Search and select a mutual fund scheme',
            'Choose investment type (SIP or Lumpsum)',
            'Enter investment amount and click "Add Client"',
        ],
    },
    {
        id: '2',
        title: 'Managing Client Portfolios',
        description: 'Track investments, view performance, and manage client holdings effectively.',
        category: 'Essential',
        duration: '8 min read',
        icon: FileText,
        color: '#3B82F6',
        steps: [
            'Go to "Clients" page to see all clients',
            'Click on any client row to view full profile',
            'View investments, transactions, and notes tabs',
            'Track returns and portfolio value in real-time',
            'Add notes for client follow-ups',
        ],
    },
    {
        id: '3',
        title: 'Using the Portfolio Dashboard',
        description: 'Understand your dashboard widgets and customize your overview.',
        category: 'Essential',
        duration: '6 min read',
        icon: PlayCircle,
        color: '#8B5CF6',
        steps: [
            'View AUM chart with time period filters',
            'Check asset allocation in the donut chart',
            'Monitor top holdings and their performance',
            'Track upcoming SIPs and recent transactions',
            'Stay updated with market news and events',
        ],
    },
    {
        id: '4',
        title: 'Searching and Navigation',
        description: 'Master the global search and navigate efficiently across the app.',
        category: 'Productivity',
        duration: '3 min read',
        icon: Search,
        color: '#F59E0B',
        steps: [
            'Press Cmd+K (Mac) or Ctrl+K (Windows) to open search',
            'Type to find clients, funds, or pages',
            'Use arrow keys to navigate results',
            'Press Enter to select and navigate',
            'Use sidebar for quick page access',
        ],
    },
    {
        id: '5',
        title: 'Exploring Mutual Funds',
        description: 'Browse fund catalog, check NAV, and analyze fund performance.',
        category: 'Essential',
        duration: '7 min read',
        icon: Bookmark,
        color: '#EC4899',
        steps: [
            'Navigate to "Mutual Funds" from sidebar',
            'Use search to find specific funds',
            'Click any fund card to view details',
            'Check 1-year NAV history chart',
            'View fund category and scheme type',
        ],
    },
    {
        id: '6',
        title: 'Exporting Reports',
        description: 'Export client data and generate reports for analysis.',
        category: 'Advanced',
        duration: '4 min read',
        icon: ExternalLink,
        color: '#6366F1',
        steps: [
            'Go to "Clients" page',
            'Apply filters if needed (fund house, type, etc.)',
            'Click "Export CSV" button in the header',
            'Download contains all filtered client data',
            'Open in Excel or Google Sheets for analysis',
        ],
    },
];

const categories = ['All', 'Beginner', 'Essential', 'Productivity', 'Advanced'];

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

    const filteredGuides = guides.filter(guide => {
        const matchesSearch = searchQuery === '' ||
            guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            guide.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || guide.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 flex gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">Quick Guides</h1>
                    <p className="text-[var(--text-secondary)]">
                        Step-by-step tutorials to help you get the most out of MF Nexus
                    </p>
                </header>

                {/* Search */}
                <div className="glass-card rounded-2xl p-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={20} />
                        <input
                            type="text"
                            placeholder="Search guides..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-mint)]/50 transition-all"
                        />
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === category
                                ? 'bg-[var(--accent-mint)]/20 text-[var(--accent-mint)] border border-[var(--accent-mint)]/30'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-transparent'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {/* Guides Grid */}
                {filteredGuides.length === 0 ? (
                    <div className="glass-card rounded-2xl p-12 text-center">
                        <Book className="mx-auto text-[var(--text-secondary)] mb-3" size={48} />
                        <p className="text-[var(--text-secondary)]">No guides found matching your search</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {filteredGuides.map((guide) => {
                            const Icon = guide.icon;
                            const isExpanded = expandedGuide === guide.id;

                            return (
                                <div
                                    key={guide.id}
                                    className={`glass-card rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'col-span-2' : ''
                                        }`}
                                >
                                    {/* Guide Header */}
                                    <div
                                        className="p-5 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                                        onClick={() => setExpandedGuide(isExpanded ? null : guide.id)}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div
                                                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: `color-mix(in srgb, ${guide.color} 20%, transparent)` }}
                                            >
                                                <Icon size={24} style={{ color: guide.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-[var(--text-primary)] font-semibold">{guide.title}</h3>
                                                    <ChevronRight
                                                        size={20}
                                                        className={`text-[var(--text-secondary)] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                    />
                                                </div>
                                                <p className="text-[var(--text-secondary)] text-sm mt-1">{guide.description}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span
                                                        className="px-2 py-0.5 rounded text-xs font-medium"
                                                        style={{
                                                            backgroundColor: `color-mix(in srgb, ${guide.color} 15%, transparent)`,
                                                            color: guide.color,
                                                        }}
                                                    >
                                                        {guide.category}
                                                    </span>
                                                    <span className="text-[var(--text-muted)] text-xs flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {guide.duration}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Steps */}
                                    {isExpanded && guide.steps && (
                                        <div className="px-5 pb-5 pt-0">
                                            <div className="pl-16 border-l-2 border-[var(--border-primary)] ml-6">
                                                <h4 className="text-[var(--text-primary)] font-medium mb-3">Steps to follow:</h4>
                                                <ol className="space-y-3">
                                                    {guide.steps.map((step, index) => (
                                                        <li key={index} className="flex items-start gap-3">
                                                            <span
                                                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                                                style={{
                                                                    backgroundColor: `color-mix(in srgb, ${guide.color} 20%, transparent)`,
                                                                    color: guide.color,
                                                                }}
                                                            >
                                                                {index + 1}
                                                            </span>
                                                            <span className="text-[var(--text-secondary)] text-sm">{step}</span>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Sidebar */}
            <Sidebar />
        </div>
    );
}
