'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types/database';

// Cache keys
const CACHE_KEY_USER = 'mfn_user_cache';
const CACHE_KEY_PROFILE = 'mfn_profile_cache';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'client';
    avatarUrl?: string;
}

interface CachedData<T> {
    data: T;
    timestamp: number;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache helpers
function getCachedData<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        const parsed: CachedData<T> = JSON.parse(cached);
        // Check if cache is still valid
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
            return parsed.data;
        }
        localStorage.removeItem(key);
        return null;
    } catch {
        return null;
    }
}

function setCachedData<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
        const cacheData: CachedData<T> = { data, timestamp: Date.now() };
        localStorage.setItem(key, JSON.stringify(cacheData));
    } catch {
        // Ignore storage errors
    }
}

function clearCache(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(CACHE_KEY_USER);
        localStorage.removeItem(CACHE_KEY_PROFILE);
    } catch {
        // Ignore
    }
}

// Map Supabase user + profile to our User type
function mapToUser(supabaseUser: SupabaseUser, profile: Profile | null): User {
    return {
        id: supabaseUser.id,
        name: profile?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        email: supabaseUser.email || '',
        role: (profile?.role === 'client') ? 'client' : 'admin',
        avatarUrl: profile?.avatar_url || undefined,
    };
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = getSupabaseClient();

    // Load cached data on mount
    useEffect(() => {
        const cachedUser = getCachedData<User>(CACHE_KEY_USER);
        const cachedProfile = getCachedData<Profile>(CACHE_KEY_PROFILE);
        
        if (cachedUser) {
            console.log('[AuthContext] Loaded user from cache');
            setUser(cachedUser);
            setProfile(cachedProfile);
            // Keep loading true until we verify with Supabase
        }
    }, []);

    // Fetch profile from database with timeout
    const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
        console.log('[AuthContext] fetchProfile called for:', userId);
        try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<{ data: null; error: null }>((resolve) => 
                setTimeout(() => {
                    console.warn('[AuthContext] fetchProfile timed out');
                    resolve({ data: null, error: null });
                }, 8000)
            );
            
            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            const result = await Promise.race([fetchPromise, timeoutPromise]);
            const { data, error } = result as any;
            
            console.log('[AuthContext] fetchProfile result:', { hasData: !!data, error: error?.message });

            if (error && error.code !== 'PGRST116') {
                console.error('[AuthContext] Error fetching profile:', error);
                return null;
            }
            return data;
        } catch (err) {
            console.error('[AuthContext] fetchProfile exception:', err);
            return null;
        }
    }, [supabase]);

    // Load user session - sets user IMMEDIATELY, then updates with profile
    const loadUserSession = useCallback(async (sessionUser: SupabaseUser): Promise<'admin' | 'client'> => {
        console.log('[AuthContext] loadUserSession called for:', sessionUser.email);
        
        // First check cache
        const cachedUser = getCachedData<User>(CACHE_KEY_USER);
        const cachedProfile = getCachedData<Profile>(CACHE_KEY_PROFILE);
        
        // If cached and same user, use cache immediately
        if (cachedUser && cachedUser.id === sessionUser.id && cachedProfile) {
            console.log('[AuthContext] Using cached user data');
            setUser(cachedUser);
            setProfile(cachedProfile);
            return cachedUser.role;
        }
        
        // Set basic user IMMEDIATELY so app doesn't hang
        const basicUser: User = {
            id: sessionUser.id,
            name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'User',
            email: sessionUser.email || '',
            role: 'admin', // Default, will update if profile says client
        };
        setUser(basicUser);
        console.log('[AuthContext] Basic user set, fetching profile...');
        
        try {
            let userProfile = await fetchProfile(sessionUser.id);
            console.log('[AuthContext] Profile fetched:', userProfile?.role);
            
            // If no profile exists, try to create one (non-blocking)
            if (!userProfile) {
                console.log('[AuthContext] No profile found, attempting to create...');
                const { error: insertError } = await (supabase.from('profiles') as any).insert({
                    id: sessionUser.id,
                    email: sessionUser.email || '',
                    full_name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'User',
                    role: 'admin',
                });
                
                console.log('[AuthContext] Profile insert result:', insertError?.message || 'success');
                
                if (!insertError || insertError.code === '23505') {
                    userProfile = await fetchProfile(sessionUser.id);
                }
            }
            
            // Update user with profile data if available
            if (userProfile) {
                const role = (userProfile.role === 'client') ? 'client' : 'admin';
                const fullUser: User = {
                    ...basicUser,
                    name: userProfile.full_name || basicUser.name,
                    role: role,
                    avatarUrl: userProfile.avatar_url || undefined,
                };
                setProfile(userProfile);
                setUser(fullUser);
                
                // Cache the data
                setCachedData(CACHE_KEY_USER, fullUser);
                setCachedData(CACHE_KEY_PROFILE, userProfile);
                
                console.log('[AuthContext] Session loaded with profile, role:', role);
                return role;
            }
            
            // Cache basic user if no profile
            setCachedData(CACHE_KEY_USER, basicUser);
            
            console.log('[AuthContext] Session loaded without profile, defaulting to admin');
            return 'admin';
        } catch (error) {
            console.error('[AuthContext] Error loading user session:', error);
            return 'admin';
        }
    }, [supabase, fetchProfile]);

    // Auth state listener
    useEffect(() => {
        let mounted = true;
        console.log('[AuthContext] Setting up auth listener...');

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                console.log('[AuthContext] Auth event:', event, session?.user?.email);

                if (event === 'SIGNED_IN' && session?.user) {
                    loadUserSession(session.user).finally(() => {
                        if (mounted) setIsLoading(false);
                    });
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setProfile(null);
                    clearCache();
                    setIsLoading(false);
                } else if (event === 'INITIAL_SESSION') {
                    if (session?.user) {
                        loadUserSession(session.user).finally(() => {
                            if (mounted) setIsLoading(false);
                        });
                    } else {
                        // No session - check if we have cached user
                        const cachedUser = getCachedData<User>(CACHE_KEY_USER);
                        if (!cachedUser) {
                            setUser(null);
                            setProfile(null);
                        }
                        setIsLoading(false);
                    }
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase, loadUserSession]);

    // Route protection
    useEffect(() => {
        if (isLoading) return;

        const publicRoutes = ['/login', '/'];
        const adminRoutes = ['/admin-dashboard', '/manage', '/clients', '/history', '/mutual-funds', '/compare'];
        const clientRoutes = ['/client-dashboard'];

        console.log('[AuthContext] Route protection:', { pathname, isLoading, user: user?.role });

        if (!user && !publicRoutes.includes(pathname)) {
            router.replace('/login');
        } else if (user) {
            if (user.role === 'client' && adminRoutes.some(r => pathname.startsWith(r))) {
                router.replace('/client-dashboard');
            } else if (user.role === 'admin' && clientRoutes.some(r => pathname.startsWith(r))) {
                router.replace('/admin-dashboard');
            }
        }
    }, [user, isLoading, pathname, router]);

    // Login function
    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        console.log('[AuthContext] Login attempt for:', email);
        try {
            setIsLoading(true);
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                console.error('[AuthContext] Login error:', error.message);
                setIsLoading(false);
                return { success: false, error: error.message };
            }

            if (data.user) {
                const role = await loadUserSession(data.user);
                const redirectPath = role === 'client' ? '/client-dashboard' : '/admin-dashboard';
                console.log('[AuthContext] Login successful, redirecting to:', redirectPath);
                router.replace(redirectPath);
            }

            setIsLoading(false);
            return { success: true };
        } catch (err) {
            console.error('[AuthContext] Login exception:', err);
            setIsLoading(false);
            return { success: false, error: 'Login failed' };
        }
    };

    // Sign up function
    const signUp = async (email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> => {
        console.log('[AuthContext] SignUp attempt for:', email);
        try {
            setIsLoading(true);
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName },
                },
            });

            if (error) {
                console.error('[AuthContext] SignUp error:', error.message);
                setIsLoading(false);
                return { success: false, error: error.message };
            }

            setIsLoading(false);
            return { success: true };
        } catch (err) {
            console.error('[AuthContext] SignUp exception:', err);
            setIsLoading(false);
            return { success: false, error: 'Sign up failed' };
        }
    };

    // Logout function
    const logout = async (): Promise<void> => {
        console.log('[AuthContext] Logging out...');
        setIsLoading(true);
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        clearCache();
        setIsLoading(false);
        router.replace('/login');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                isLoading,
                login,
                signUp,
                logout,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
