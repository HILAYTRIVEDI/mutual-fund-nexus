'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SettingsContextType {
    ltcgTax: number;
    stcgTax: number;
    updateSettings: (settings: { ltcgTax: number; stcgTax: number }) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    // Default tax rates (Indian Mutual Fund standards as placeholders)
    // LTCG: 12.5% (typically for equity > 1 year)
    // STCG: 20% (typically for equity < 1 year)
    const [ltcgTax, setLtcgTax] = useState<number>(12.5);
    const [stcgTax, setStcgTax] = useState<number>(20);

    const updateSettings = (settings: { ltcgTax: number; stcgTax: number }) => {
        setLtcgTax(settings.ltcgTax);
        setStcgTax(settings.stcgTax);
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
