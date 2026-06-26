'use client';

import { useSettings } from '@/context/SettingsContext';

export default function PrivacyValue({ value }: { value: string | number }) {
    const { privacyMode } = useSettings();
    if (privacyMode) {
        return <span className="select-none tracking-widest opacity-50">•••••</span>;
    }
    return <>{value}</>;
}
