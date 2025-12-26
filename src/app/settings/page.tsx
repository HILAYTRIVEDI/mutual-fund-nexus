'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useSettings } from '@/context/SettingsContext';
import { Save, Percent, AlertCircle, Check } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationBell from '@/components/NotificationBell';

export default function SettingsPage() {
    const { ltcgTax, stcgTax, updateSettings } = useSettings();

    // Local state for form inputs
    const [localLtcg, setLocalLtcg] = useState(ltcgTax.toString());
    const [localStcg, setLocalStcg] = useState(stcgTax.toString());

    // UI states
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Sync with context if it changes externally
    useEffect(() => {
        setLocalLtcg(ltcgTax.toString());
        setLocalStcg(stcgTax.toString());
    }, [ltcgTax, stcgTax]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const ltcg = parseFloat(localLtcg);
        const stcg = parseFloat(localStcg);

        if (isNaN(ltcg) || isNaN(stcg) || ltcg < 0 || stcg < 0) {
            setSaveStatus('error');
            setIsSaving(false);
            return;
        }

        updateSettings({ ltcgTax: ltcg, stcgTax: stcg });
        setSaveStatus('success');
        setIsSaving(false);

        // Reset success message after 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1 min-w-0 order-2 md:order-1">
                {/* Header */}
                <header className="mb-6 md:mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
                            Settings
                        </h1>
                        <p className="text-[var(--text-secondary)] text-xs md:text-sm mt-1">
                            Manage application configurations and tax rules
                        </p>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                        <ThemeToggle />
                        <NotificationBell />
                    </div>
                </header>

                <div className="max-w-4xl space-y-6">
                    {/* Tax Configuration Card */}
                    <div className="glass-card rounded-2xl p-6 md:p-8 gradient-border relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]">
                                <Percent size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-semibold text-[var(--text-primary)]">Tax Configuration</h2>
                                <p className="text-[var(--text-secondary)] text-sm">Set default capital gains tax rates for portfolio calculations</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            {/* LTCG Field */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">
                                    Long Term Capital Gains (LTCG) Tax
                                </label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={localLtcg}
                                        onChange={(e) => setLocalLtcg(e.target.value)}
                                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-mint)] focus:ring-1 focus:ring-[var(--accent-mint)] transition-all pr-12 group-hover:border-[var(--text-secondary)]/50"
                                        placeholder="12.5"
                                        step="0.1"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-medium">
                                        %
                                    </div>
                                </div>
                                <p className="text-[10px] md:text-xs text-[var(--text-muted)]">
                                    Applied on gains exceeding ₹1.25 Lakhs for equity funds held {'>'} 1 year.
                                </p>
                            </div>

                            {/* STCG Field */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">
                                    Short Term Capital Gains (STCG) Tax
                                </label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={localStcg}
                                        onChange={(e) => setLocalStcg(e.target.value)}
                                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-mint)] focus:ring-1 focus:ring-[var(--accent-mint)] transition-all pr-12 group-hover:border-[var(--text-secondary)]/50"
                                        placeholder="20"
                                        step="0.1"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-medium">
                                        %
                                    </div>
                                </div>
                                <p className="text-[10px] md:text-xs text-[var(--text-muted)]">
                                    Applied on gains for equity funds held {'<'} 1 year.
                                </p>
                            </div>
                        </div>

                        {/* Action Footer */}
                        <div className="mt-8 pt-6 border-t border-[var(--border-primary)] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {saveStatus === 'success' && (
                                    <span className="flex items-center gap-1 text-[var(--accent-mint)] text-sm font-medium animate-fade-in">
                                        <Check size={16} /> Saved successfully
                                    </span>
                                )}
                                {saveStatus === 'error' && (
                                    <span className="flex items-center gap-1 text-[var(--accent-red)] text-sm font-medium animate-fade-in">
                                        <AlertCircle size={16} /> Invalid values
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className={`
                                    px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all
                                    ${isSaving
                                        ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)] cursor-wait'
                                        : 'bg-gradient-to-r from-[var(--accent-mint)] to-[#90e0ef] text-white hover:shadow-lg hover:shadow-[var(--accent-mint)]/20 active:scale-95'
                                    }
                                `}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Placeholder for other settings */}
                    <div className="glass-card rounded-2xl p-6 md:p-8 border border-[var(--border-primary)] opacity-60 pointer-events-none">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-semibold text-[var(--text-primary)]">System Notifications</h2>
                                <p className="text-[var(--text-secondary)] text-sm">Configure email and push alerts (Coming Soon)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Sidebar */}
            <div className="order-1 md:order-2">
                <Sidebar />
            </div>
        </div>
    );
}
