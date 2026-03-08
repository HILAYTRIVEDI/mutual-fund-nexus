'use client';

import { useEffect, useState } from 'react';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface PendingSettlement {
    id: string;
    scheme_code: string;
    units_sold: number;
    expected_amount: number;
    sell_date: string;
    expected_settlement_date: string;
    status: string;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

export default function PendingSettlementsCard() {
    const [settlements, setSettlements] = useState<PendingSettlement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettlements = async () => {
            // Initializing Supabase client for reading active settlements
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { data, error } = await supabase
                .from('pending_settlements')
                .select('*')
                .order('expected_settlement_date', { ascending: true });

            if (data && !error) {
                setSettlements(data);
            }
            setLoading(false);
        };
        fetchSettlements();
    }, []);

    if (loading) return null; // Or a sleek skeleton

    // Do not show the card if there are no pending settlements
    if (settlements.length === 0) return null;

    return (
        <div className="glass-card rounded-2xl p-4 md:p-6 gradient-border relative overflow-hidden transition-colors duration-300">
            {/* Warning Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-gold)]/10 via-transparent to-[var(--accent-red)]/5 pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10 w-full">
                <div className="flex items-center gap-2">
                    <Clock className="text-[var(--accent-gold)]" size={20} />
                    <h3 className="text-[var(--text-primary)] font-semibold text-lg md:text-xl">Pending Settlements</h3>
                </div>
                <div className="px-2 py-1 rounded-full bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] text-xs font-medium">
                    {settlements.length} Active
                </div>
            </div>

            <div className="space-y-3 relative z-10 w-full overflow-x-auto pb-2">
                {/* Mobile-first Stack approach */}
                <div className="flex flex-col gap-3 min-w-[280px]">
                    {settlements.map((item) => {
                        const isOverdue = new Date(item.expected_settlement_date) < new Date();

                        return (
                            <div
                                key={item.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--bg-hover)] gap-3 sm:gap-6 w-full"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-[var(--text-primary)] font-medium text-sm truncate">
                                        {item.scheme_code}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-[var(--text-secondary)] text-xs">
                                            {item.units_sold.toFixed(2)} Units
                                        </p>
                                        <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span>
                                        <p className="text-[var(--text-secondary)] text-xs truncate">
                                            Sold on: {new Date(item.sell_date).toLocaleDateString('en-IN')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-[var(--border-primary)] sm:border-t-0">
                                    <div className="text-left sm:text-right">
                                        <p className="text-[var(--text-secondary)] text-xs mb-0.5">Expected</p>
                                        <p className="text-[var(--accent-mint)] font-semibold text-sm">
                                            {formatCurrency(item.expected_amount)}
                                        </p>
                                    </div>
                                    <div className={`flex flex-col items-end`}>
                                        <p className="text-[var(--text-secondary)] text-xs mb-0.5">By Date</p>
                                        <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-[var(--accent-red)]' : 'text-[var(--text-primary)]'}`}>
                                            {isOverdue ? <AlertCircle size={12} /> : <CheckCircle2 size={12} className="text-[var(--text-muted)]" />}
                                            {new Date(item.expected_settlement_date).toLocaleDateString('en-IN')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
