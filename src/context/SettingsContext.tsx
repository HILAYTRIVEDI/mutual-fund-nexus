'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

const STORAGE_KEY = 'mf_nexus_tax_settings';
const DEFAULTS = { ltcgTax: 12.5, stcgTax: 20 };

function loadFromStorage(): { ltcgTax: number; stcgTax: number } {
    if (typeof window === 'undefined') return DEFAULTS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULTS;
        const parsed = JSON.parse(raw);
        const ltcg = parseFloat(parsed.ltcgTax);
        const stcg = parseFloat(parsed.stcgTax);
        if (!isNaN(ltcg) && !isNaN(stcg) && ltcg >= 0 && stcg >= 0) {
            return { ltcgTax: ltcg, stcgTax: stcg };
        }
    } catch {
        // ignore malformed data
    }
    return DEFAULTS;
}

interface SettingsContextType {
    ltcgTax: number;
    stcgTax: number;
    updateSettings: (settings: { ltcgTax: number; stcgTax: number }) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [ltcgTax, setLtcgTax] = useState<number>(DEFAULTS.ltcgTax);
    const [stcgTax, setStcgTax] = useState<number>(DEFAULTS.stcgTax);

    // Hydrate from localStorage after mount (avoids SSR mismatch)
    useEffect(() => {
        const saved = loadFromStorage();
        setLtcgTax(saved.ltcgTax);
        setStcgTax(saved.stcgTax);
    }, []);

    const updateSettings = (settings: { ltcgTax: number; stcgTax: number }) => {
        setLtcgTax(settings.ltcgTax);
        setStcgTax(settings.stcgTax);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {
            // ignore quota errors
        }
    };

    return (
        <SettingsContext.Provider value={{ ltcgTax, stcgTax, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
