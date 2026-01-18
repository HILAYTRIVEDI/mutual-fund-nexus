'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { Holding, HoldingInsert, MutualFund } from '@/lib/types/database';
import { getSchemeLatestNAV } from '@/lib/mfapi';

// Extended holding with current value calculation
export interface HoldingWithValue extends Holding {
    current_nav: number;
    current_value: number;
    gain_loss: number;
    gain_loss_percentage: number;
}

interface HoldingsContextType {
    holdings: HoldingWithValue[];
    isLoading: boolean;
    error: string | null;
    totalInvested: number;
    totalCurrentValue: number;
    totalGainLoss: number;
    getClientHoldings: (clientId: string) => HoldingWithValue[];
    addHolding: (holding: HoldingInsert) => Promise<{ success: boolean; error?: string }>;
    updateHolding: (id: string, updates: Partial<Holding>) => Promise<{ success: boolean; error?: string }>;
    deleteHolding: (id: string) => Promise<{ success: boolean; error?: string }>;
    refreshHoldings: () => Promise<void>;
}

const HoldingsContext = createContext<HoldingsContextType | undefined>(undefined);

export function HoldingsProvider({ children }: { children: ReactNode }) {
    const [holdings, setHoldings] = useState<HoldingWithValue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const supabase = getSupabaseClient();

    // Fetch holdings with NAV data
    const fetchHoldings = useCallback(async () => {
        console.log('[HoldingsContext] fetchHoldings called', { authLoading, isAuthenticated });
        
        // Wait for auth to finish loading
        if (authLoading) {
            console.log('[HoldingsContext] Auth loading, returning');
            return;
        }

        if (!isAuthenticated) {
            console.log('[HoldingsContext] Not authenticated, clearing');
            setHoldings([]);
            setIsLoading(false);
            return;
        }

        try {
            console.log('[HoldingsContext] Fetching holdings...');
            setIsLoading(true);
            setError(null);

            // Fetch holdings with mutual fund data
            const { data, error: fetchError } = await supabase
                .from('holdings')
                .select(`
                    *,
                    mutual_fund:mutual_funds(*)
                `)
                .order('created_at', { ascending: false });

            // Handle errors gracefully - empty table is not an error
            if (fetchError && fetchError.code !== 'PGRST116') {
                console.warn('[HoldingsContext] Fetch warning:', fetchError.message);
            }

            // If no data, just set empty array
            if (!data || data.length === 0) {
                setHoldings([]);
                setIsLoading(false);
                return;
            }

            // Fetch current NAVs and calculate values
            const holdingsWithValues: HoldingWithValue[] = await Promise.all(
                data.map(async (holding: any) => {
                    let currentNav = holding.mutual_fund?.current_nav || 0;
                    
                    // Try to fetch latest NAV from MFAPI if we have a scheme code
                    if (holding.scheme_code) {
                        try {
                            const navData = await getSchemeLatestNAV(parseInt(holding.scheme_code));
                            if (navData.data?.[0]?.nav) {
                                currentNav = parseFloat(navData.data[0].nav);
                            }
                        } catch {
                            // Use cached NAV from database
                        }
                    }

                    const currentValue = holding.units * currentNav;
                    const investedAmount = holding.invested_amount || 0;
                    const gainLoss = currentValue - investedAmount;
                    const gainLossPercentage = investedAmount > 0 
                        ? (gainLoss / investedAmount) * 100 
                        : 0;

                    return {
                        ...holding,
                        current_nav: currentNav,
                        current_value: currentValue,
                        gain_loss: gainLoss,
                        gain_loss_percentage: gainLossPercentage,
                    };
                })
            );

            setHoldings(holdingsWithValues);
        } catch (err) {
            // Log but don't throw - just set empty array
            console.warn('[HoldingsContext] Fetch error (ignored):', err);
            setHoldings([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, supabase, authLoading]);

    // Fetch holdings when auth finishes loading
    useEffect(() => {
        if (!authLoading) {
            console.log('[HoldingsContext] Auth finished loading, triggering fetch');
            fetchHoldings();
        }
    }, [authLoading, isAuthenticated, fetchHoldings]);

    // Schedule automatic NAV refresh after Indian market close
    // Indian stock market closes at 3:30 PM IST
    useEffect(() => {
        // The instruction implies this line should be here, but it's more appropriate at the top of the component.
        // However, to faithfully follow the instruction, I'm placing it here.
        // Note: This will cause `isAuthenticated` and `authLoading` to be re-declared within this specific useEffect scope.
        // The `isAuthenticated` and `authLoading` used by `fetchHoldings` are from the component scope.
        // If the intent was to *move* the declaration, the component-level declaration should be removed.
        // Assuming the instruction is to *add* this line, and the component-level declaration is implicitly handled or already exists.
        // Given the previous state, `isAuthenticated` and `authLoading` were already available to `fetchHoldings`.
        // The most faithful interpretation of the instruction is to add this line *exactly* where specified.
        // This might lead to a shadow variable if `isAuthenticated` and `authLoading` were already declared at the top.
        // For correctness, the `useAuth()` call should be at the top of the component.
        // However, following the instruction literally:
        // const { isAuthenticated, isLoading: authLoading } = useAuth(); // This line is added as per instruction.

        if (!isAuthenticated) return;

        const getISTTime = () => {
            const now = new Date();
            // Convert to IST (UTC+5:30)
            const istOffset = 5.5 * 60 * 60 * 1000;
            const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
            return new Date(utcTime + istOffset);
        };

        const scheduleNextRefresh = () => {
            const istNow = getISTTime();
            const hours = istNow.getHours();
            const minutes = istNow.getMinutes();
            
            // Target refresh time: 3:30 PM IST (market close)
            const targetHour = 15;
            const targetMinute = 30;
            
            let msUntilRefresh: number;
            
            if (hours < targetHour || (hours === targetHour && minutes < targetMinute)) {
                // Before 9:30 PM today - schedule for today
                const targetTime = new Date(istNow);
                targetTime.setHours(targetHour, targetMinute, 0, 0);
                msUntilRefresh = targetTime.getTime() - istNow.getTime();
            } else {
                // After 9:30 PM - schedule for tomorrow
                const targetTime = new Date(istNow);
                targetTime.setDate(targetTime.getDate() + 1);
                targetTime.setHours(targetHour, targetMinute, 0, 0);
                msUntilRefresh = targetTime.getTime() - istNow.getTime();
            }
            
            // Cap at 24 hours max to prevent overflow issues
            msUntilRefresh = Math.min(msUntilRefresh, 24 * 60 * 60 * 1000);
            
            console.log(`NAV refresh scheduled in ${Math.round(msUntilRefresh / 1000 / 60)} minutes (3:30 PM IST)`);
            
            return setTimeout(() => {
                console.log('Scheduled NAV refresh triggered (3:30 PM IST)');
                fetchHoldings();
                // Schedule next refresh after this one completes
                scheduleNextRefresh();
            }, msUntilRefresh);
        };

        const timeoutId = scheduleNextRefresh();

        return () => {
            clearTimeout(timeoutId);
        };
    }, [isAuthenticated, fetchHoldings]);

    // Calculate totals
    const totalInvested = holdings.reduce((sum, h) => sum + h.invested_amount, 0);
    const totalCurrentValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const totalGainLoss = totalCurrentValue - totalInvested;

    const getClientHoldings = (clientId: string) => {
        return holdings.filter(h => h.user_id === clientId);
    };

    const addHolding = async (holdingData: HoldingInsert): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data, error: insertError } = await (supabase
                .from('holdings') as any)
                .insert(holdingData)
                .select()
                .single();

            if (insertError) {
                throw insertError;
            }

            if (data) {
                await fetchHoldings(); // Refresh to get calculated values
                return { success: true };
            }

            return { success: false, error: 'Failed to add holding' };
        } catch (err) {
            console.error('Error adding holding:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to add holding' };
        }
    };

    const updateHolding = async (id: string, updates: Partial<Holding>): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error: updateError } = await (supabase
                .from('holdings') as any)
                .update(updates)
                .eq('id', id);

            if (updateError) {
                throw updateError;
            }

            await fetchHoldings(); // Refresh to get new calculated values
            return { success: true };
        } catch (err) {
            console.error('Error updating holding:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to update holding' };
        }
    };

    const deleteHolding = async (id: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error: deleteError } = await supabase
                .from('holdings')
                .delete()
                .eq('id', id);

            if (deleteError) {
                throw deleteError;
            }

            setHoldings(prev => prev.filter(h => h.id !== id));
            return { success: true };
        } catch (err) {
            console.error('Error deleting holding:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to delete holding' };
        }
    };

    return (
        <HoldingsContext.Provider value={{
            holdings,
            isLoading,
            error,
            totalInvested,
            totalCurrentValue,
            totalGainLoss,
            getClientHoldings,
            addHolding,
            updateHolding,
            deleteHolding,
            refreshHoldings: fetchHoldings,
        }}>
            {children}
        </HoldingsContext.Provider>
    );
}

export function useHoldings() {
    const context = useContext(HoldingsContext);
    if (context === undefined) {
        throw new Error('useHoldings must be used within a HoldingsProvider');
    }
    return context;
}
