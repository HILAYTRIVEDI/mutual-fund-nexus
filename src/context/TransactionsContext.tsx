'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { Transaction, TransactionInsert } from '@/lib/types/database';

interface TransactionsContextType {
    transactions: Transaction[];
    isLoading: boolean;
    error: string | null;
    getClientTransactions: (clientId: string) => Transaction[];
    getRecentTransactions: (limit?: number) => Transaction[];
    addTransaction: (transaction: TransactionInsert) => Promise<{ success: boolean; error?: string }>;
    deleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;
    refreshTransactions: () => Promise<void>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function TransactionsProvider({ children }: { children: ReactNode }) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const supabase = getSupabaseClient();

    const fetchTransactions = useCallback(async () => {
        // Wait for auth to finish loading first
        if (authLoading) {
            return;
        }
        
        if (!isAuthenticated) {
            setTransactions([]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('transactions')
                .select(`
                    *,
                    mutual_fund:mutual_funds(*),
                    profile:profiles(*)
                `)
                .order('date', { ascending: false });

            // Handle errors gracefully - empty table is not an error
            if (fetchError && fetchError.code !== 'PGRST116') {
                console.warn('[TransactionsContext] Fetch warning:', fetchError.message);
            }

            setTransactions(data || []);
        } catch (err) {
            // Log but don't throw - just set empty array
            console.warn('[TransactionsContext] Fetch error (ignored):', err);
            setTransactions([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, supabase, authLoading]);

    // Fetch when auth finishes loading
    useEffect(() => {
        if (!authLoading) {
            fetchTransactions();
        }
    }, [authLoading, isAuthenticated, fetchTransactions]);

    const getClientTransactions = (clientId: string) => {
        return transactions.filter(t => t.user_id === clientId);
    };

    const getRecentTransactions = (limit = 10) => {
        return transactions.slice(0, limit);
    };

    const addTransaction = async (transactionData: TransactionInsert): Promise<{ success: boolean; error?: string }> => {
        console.log('[TransactionsContext] addTransaction called with:', transactionData);
        try {
            const { data, error: insertError } = await (supabase
                .from('transactions') as any)
                .insert(transactionData)
                .select()
                .single();

            if (insertError) {
                console.error('[TransactionsContext] Insert error:', insertError);
                throw insertError;
            }

            console.log('[TransactionsContext] Transaction inserted successfully:', data);

            if (data) {
                setTransactions(prev => [data, ...prev]);
                return { success: true };
            }

            return { success: false, error: 'Failed to add transaction' };
        } catch (err) {
            console.error('[TransactionsContext] Error adding transaction:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to add transaction' };
        }
    };

    const reconcileHolding = async (userId: string, schemeCode: string) => {
        type ReconcileTransaction = { units: number | null; amount: number | null };

        const { data: completedTxs, error: txFetchError } = await (supabase
            .from('transactions') as any)
            .select('units, amount')
            .eq('user_id', userId)
            .eq('scheme_code', schemeCode)
            .eq('status', 'completed')
            .in('type', ['buy', 'sip']) as { data: ReconcileTransaction[] | null; error: any };

        if (txFetchError) {
            throw txFetchError;
        }

        const { data: existingHolding, error: holdingFetchError } = await (supabase
            .from('holdings') as any)
            .select('id')
            .eq('user_id', userId)
            .eq('scheme_code', schemeCode)
            .maybeSingle();

        if (holdingFetchError) {
            throw holdingFetchError;
        }

        if (!completedTxs || completedTxs.length === 0) {
            if (existingHolding?.id) {
                const { error: deleteHoldingError } = await supabase
                    .from('holdings')
                    .delete()
                    .eq('id', existingHolding.id);

                if (deleteHoldingError) {
                    throw deleteHoldingError;
                }
            }
            return;
        }

        const totalUnits = completedTxs.reduce((sum, tx) => sum + (tx.units || 0), 0);
        const totalAmount = completedTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        const averagePrice = totalUnits > 0 ? totalAmount / totalUnits : 0;

        if (existingHolding?.id) {
            const { error: updateHoldingError } = await (supabase
                .from('holdings') as any)
                .update({ units: totalUnits, average_price: averagePrice })
                .eq('id', existingHolding.id);

            if (updateHoldingError) {
                throw updateHoldingError;
            }
        }
    };

    const deleteTransaction = async (id: string): Promise<{ success: boolean; error?: string }> => {
        try {
            type RemovableTransaction = {
                id: string;
                user_id: string;
                scheme_code: string | null;
                type: Transaction['type'];
                status: Transaction['status'];
            };

            const { data: transaction, error: fetchError } = await (supabase
                .from('transactions') as any)
                .select('id, user_id, scheme_code, type, status')
                .eq('id', id)
                .single() as { data: RemovableTransaction | null; error: any };

            if (fetchError) {
                throw fetchError;
            }

            if (transaction?.type !== 'sip') {
                return { success: false, error: 'Only SIP transactions can be removed from this screen' };
            }

            const { error: deleteError } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);

            if (deleteError) {
                throw deleteError;
            }

            if (transaction.scheme_code && transaction.status === 'completed') {
                await reconcileHolding(transaction.user_id, transaction.scheme_code);
            }

            await fetchTransactions();
            return { success: true };
        } catch (err) {
            console.error('[TransactionsContext] Error deleting transaction:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to delete transaction' };
        }
    };

    return (
        <TransactionsContext.Provider value={{
            transactions,
            isLoading,
            error,
            getClientTransactions,
            getRecentTransactions,
            addTransaction,
            deleteTransaction,
            refreshTransactions: fetchTransactions,
        }}>
            {children}
        </TransactionsContext.Provider>
    );
}

export function useTransactions() {
    const context = useContext(TransactionsContext);
    if (context === undefined) {
        throw new Error('useTransactions must be used within a TransactionsProvider');
    }
    return context;
}
