'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { Save, Percent, AlertCircle, Check, Mail, Bell, Send, Loader2, KeyRound, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationBell from '@/components/NotificationBell';

export default function SettingsPage() {
    const { ltcgTax, stcgTax, updateSettings } = useSettings();
    const { user } = useAuth();
    const supabase = getSupabaseClient();

    // Local state for form inputs
    const [localLtcg, setLocalLtcg] = useState(ltcgTax.toString());
    const [localStcg, setLocalStcg] = useState(stcgTax.toString());

    // Email notification preferences
    const [emailSipReminders, setEmailSipReminders] = useState(true);
    const [emailSipExecuted, setEmailSipExecuted] = useState(true);
    const [reminderDaysBefore, setReminderDaysBefore] = useState(2);
    const [loadingPreferences, setLoadingPreferences] = useState(true);

    // UI states
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [isSavingEmail, setIsSavingEmail] = useState(false);
    const [emailSaveStatus, setEmailSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Password reset states (admin only)
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Sync with context if it changes externally
    useEffect(() => {
        setLocalLtcg(ltcgTax.toString());
        setLocalStcg(stcgTax.toString());
    }, [ltcgTax, stcgTax]);

    // Fetch email preferences from database
    useEffect(() => {
        async function fetchPreferences() {
            if (!user) {
                setLoadingPreferences(false);
                return;
            }

            try {
                // Type assertion needed since these columns may not exist in all environments
                const { data, error } = await supabase
                    .from('profiles')
                    .select('email_sip_reminders, email_sip_executed, reminder_days_before')
                    .eq('id', user.id)
                    .single() as { data: { email_sip_reminders?: boolean; email_sip_executed?: boolean; reminder_days_before?: number } | null; error: any };

                if (error) {
                    console.error('Error fetching preferences:', error);
                    return;
                }

                if (data) {
                    setEmailSipReminders(data.email_sip_reminders ?? true);
                    setEmailSipExecuted(data.email_sip_executed ?? true);
                    setReminderDaysBefore(data.reminder_days_before ?? 2);
                }
            } catch (err) {
                console.error('Error loading preferences:', err);
            } finally {
                setLoadingPreferences(false);
            }
        }

        fetchPreferences();
    }, [user, supabase]);

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

    const handleSaveEmailPreferences = async () => {
        if (!user) return;

        setIsSavingEmail(true);
        setEmailSaveStatus('idle');

        try {
            const { error } = await (supabase
                .from('profiles') as any)
                .update({
                    email_sip_reminders: emailSipReminders,
                    email_sip_executed: emailSipExecuted,
                    reminder_days_before: reminderDaysBefore,
                })
                .eq('id', user.id);

            if (error) {
                throw error;
            }

            setEmailSaveStatus('success');
            setTimeout(() => setEmailSaveStatus('idle'), 3000);
        } catch (err) {
            console.error('Error saving email preferences:', err);
            setEmailSaveStatus('error');
        } finally {
            setIsSavingEmail(false);
        }
    };

    const handleSendTestEmail = async () => {
        if (!user?.email) return;

        setIsSendingTest(true);
        setTestEmailStatus('idle');

        try {
            const supabase = getSupabaseClient();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const response = await fetch('/api/email/send', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    to: user.email,
                    type: 'sip-reminder',
                }),
            });

            if (response.ok) {
                setTestEmailStatus('success');
            } else {
                const data = await response.json();
                console.error('Test email failed:', data.error);
                setTestEmailStatus('error');
            }
        } catch (err) {
            console.error('Error sending test email:', err);
            setTestEmailStatus('error');
        } finally {
            setIsSendingTest(false);
            setTimeout(() => setTestEmailStatus('idle'), 5000);
        }
    };

    const handlePasswordReset = async () => {
        setResetStatus(null);
        if (newPassword.length < 6) {
            setResetStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setResetStatus({ type: 'error', message: 'Passwords do not match.' });
            return;
        }
        setResetLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setResetStatus({ type: 'success', message: 'Password updated successfully.' });
            setNewPassword('');
            setConfirmPassword('');
            setShowNew(false);
            setShowConfirm(false);
            setTimeout(() => setResetStatus(null), 3000);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update password.';
            setResetStatus({ type: 'error', message });
        } finally {
            setResetLoading(false);
        }
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
                            Manage application configurations and notifications
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
                                        : 'bg-gradient-to-r from-[var(--accent-mint)] to-[#D4B87A] text-white hover:shadow-lg hover:shadow-[var(--accent-mint)]/20 active:scale-95'
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

                    {/* Email Notifications Card */}
                    <div className="glass-card rounded-2xl p-6 md:p-8 gradient-border relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
                                <Mail size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-semibold text-[var(--text-primary)]">Email Notifications</h2>
                                <p className="text-[var(--text-secondary)] text-sm">Configure SIP reminder and confirmation emails</p>
                            </div>
                        </div>

                        {loadingPreferences ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="animate-spin text-[var(--accent-blue)]" size={32} />
                            </div>
                        ) : (
                            <>
                                <div className="space-y-6">
                                    {/* SIP Reminder Toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)]">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-[var(--accent-mint)]/10">
                                                <Bell size={18} className="text-[var(--accent-mint)]" />
                                            </div>
                                            <div>
                                                <p className="text-[var(--text-primary)] font-medium">SIP Reminders</p>
                                                <p className="text-[var(--text-secondary)] text-sm">Get notified before upcoming SIP payments</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setEmailSipReminders(!emailSipReminders)}
                                            className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                                                emailSipReminders ? 'bg-[var(--accent-mint)]' : 'bg-[var(--bg-primary)] border border-[var(--border-primary)]'
                                            }`}
                                        >
                                            <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-transform duration-200 shadow-sm ${
                                                emailSipReminders ? 'translate-x-6' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* SIP Executed Toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)]">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-[var(--accent-purple)]/10">
                                                <Check size={18} className="text-[var(--accent-purple)]" />
                                            </div>
                                            <div>
                                                <p className="text-[var(--text-primary)] font-medium">SIP Confirmation</p>
                                                <p className="text-[var(--text-secondary)] text-sm">Get notified when SIP is successfully executed</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setEmailSipExecuted(!emailSipExecuted)}
                                            className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                                                emailSipExecuted ? 'bg-[var(--accent-purple)]' : 'bg-[var(--bg-primary)] border border-[var(--border-primary)]'
                                            }`}
                                        >
                                            <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-transform duration-200 shadow-sm ${
                                                emailSipExecuted ? 'translate-x-6' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* Reminder Days Selector */}
                                    {emailSipReminders && (
                                        <div className="p-4 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)]">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-[var(--text-primary)] font-medium">Reminder Timing</p>
                                                    <p className="text-[var(--text-secondary)] text-sm">How many days before SIP should we remind?</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {[1, 2, 3].map((days) => (
                                                        <button
                                                            key={days}
                                                            onClick={() => setReminderDaysBefore(days)}
                                                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                                                reminderDaysBefore === days
                                                                    ? 'bg-[var(--accent-blue)] text-white'
                                                                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-blue)]'
                                                            }`}
                                                        >
                                                            {days} day{days > 1 ? 's' : ''}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Test Email */}
                                    <div className="p-4 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)] border-dashed">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[var(--text-primary)] font-medium">Test Email</p>
                                                <p className="text-[var(--text-secondary)] text-sm">Send a test SIP reminder to {user?.email || 'your email'}</p>
                                            </div>
                                            <button
                                                onClick={handleSendTestEmail}
                                                disabled={isSendingTest}
                                                className="px-4 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSendingTest ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : testEmailStatus === 'success' ? (
                                                    <Check size={16} className="text-[var(--accent-mint)]" />
                                                ) : testEmailStatus === 'error' ? (
                                                    <AlertCircle size={16} className="text-[var(--accent-red)]" />
                                                ) : (
                                                    <Send size={16} />
                                                )}
                                                {testEmailStatus === 'success' ? 'Sent!' : testEmailStatus === 'error' ? 'Failed' : 'Send Test'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Footer */}
                                <div className="mt-8 pt-6 border-t border-[var(--border-primary)] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {emailSaveStatus === 'success' && (
                                            <span className="flex items-center gap-1 text-[var(--accent-mint)] text-sm font-medium animate-fade-in">
                                                <Check size={16} /> Preferences saved
                                            </span>
                                        )}
                                        {emailSaveStatus === 'error' && (
                                            <span className="flex items-center gap-1 text-[var(--accent-red)] text-sm font-medium animate-fade-in">
                                                <AlertCircle size={16} /> Failed to save
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleSaveEmailPreferences}
                                        disabled={isSavingEmail}
                                        className={`
                                            px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all
                                            ${isSavingEmail
                                                ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)] cursor-wait'
                                                : 'bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-white hover:shadow-lg hover:shadow-[var(--accent-blue)]/20 active:scale-95'
                                            }
                                        `}
                                    >
                                        {isSavingEmail ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                Save Preferences
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Admin Password Reset Card - only visible to admins */}
                    {user?.role === 'admin' && (
                        <div className="glass-card rounded-2xl p-6 md:p-8 gradient-border relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 rounded-xl bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]">
                                    <KeyRound size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg md:text-xl font-semibold text-[var(--text-primary)]">Admin Password</h2>
                                    <p className="text-[var(--text-secondary)] text-sm">Change your admin account password</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* New Password */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-[var(--text-secondary)]">
                                            New Password
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type={showNew ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Min 6 characters"
                                                className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] transition-all pr-12 group-hover:border-[var(--text-secondary)]/50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNew(!showNew)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                                            >
                                                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-[var(--text-secondary)]">
                                            Confirm Password
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type={showConfirm ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Re-enter password"
                                                className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] transition-all pr-12 group-hover:border-[var(--text-secondary)]/50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm(!showConfirm)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                                            >
                                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="mt-8 pt-6 border-t border-[var(--border-primary)] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {resetStatus && (
                                        <span className={`flex items-center gap-1 text-sm font-medium animate-fade-in ${resetStatus.type === 'success' ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                            {resetStatus.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                            {resetStatus.message}
                                        </span>
                                    )}
                                </div>

                                <button
                                    onClick={handlePasswordReset}
                                    disabled={resetLoading || !newPassword || !confirmPassword}
                                    className={`
                                        px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all
                                        ${resetLoading
                                            ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)] cursor-wait'
                                            : 'bg-gradient-to-r from-[var(--accent-gold)] to-[#D4A265] text-white hover:shadow-lg hover:shadow-[var(--accent-gold)]/20 active:scale-95'
                                        }
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    `}
                                >
                                    {resetLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <KeyRound size={18} />
                                            Update Password
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Sidebar */}
            <div className="order-1 md:order-2">
                <Sidebar />
            </div>
        </div>
    );
}
