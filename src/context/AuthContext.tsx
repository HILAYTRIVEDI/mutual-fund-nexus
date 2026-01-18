'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types/database';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'client';
    avatarUrl?: string;
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
                setProfile(userProfile);
                setUser({
                    ...basicUser,
                    name: userProfile.full_name || basicUser.name,
                    role: role,
                    avatarUrl: userProfile.avatar_url || undefined,
                });
                console.log('[AuthContext] Session loaded with profile, role:', role);
                return role;
            }
            
            console.log('[AuthContext] Session loaded without profile, defaulting to advisor');
            return 'admin';
        } catch (error) {
            console.error('[AuthContext] Error loading user session:', error);
            return 'admin';
        }
    }, [supabase, fetchProfile]);

    // Initialize auth state via listener - this is the SINGLE source of truth
    useEffect(() => {
        console.log('[AuthContext] Setting up auth listener...');
        let mounted = true;
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[AuthContext] Auth event:', event, session?.user?.email);
            
            if (!mounted) return;
            
            if (session?.user) {
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
                    await loadUserSession(session.user);
                }
            } else if (event === 'SIGNED_OUT') {
                console.log('[AuthContext] User signed out');
                setUser(null);
                setProfile(null);
            }
            
            // Always clear loading after processing
            if (mounted) {
                setIsLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase, loadUserSession]);

    // Route protection - SINGLE location for all redirects based on auth state
    useEffect(() => {
        // Don't do anything while loading
        if (isLoading) return;
        
        const publicRoutes = ['/login', '/signup', '/forgot-password'];
        const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

        console.log('[AuthContext] Route protection:', { user: user?.email, pathname, isPublicRoute });

        if (!user && !isPublicRoute) {
            // Not logged in, trying to access protected route
            console.log('[AuthContext] Redirecting to /login');
            router.replace('/login');
        } else if (user && pathname === '/login') {
            // Logged in but on login page - redirect to dashboard
            const target = user.role === 'client' ? '/client-dashboard' : '/admin-dashboard';
            console.log('[AuthContext] Redirecting to:', target);
            router.replace(target);
        }
    }, [user, pathname, router, isLoading]);

    // Login - just authenticates, redirect handled by route protection effect
    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        console.log('[AuthContext] Login attempt:', email);
        setIsLoading(true);
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                console.log('[AuthContext] Login error:', error.message);
                setIsLoading(false);
                return { success: false, error: error.message };
            }

            if (data.user) {
                // Load session - the auth listener will also fire but this ensures immediate state
                const role = await loadUserSession(data.user);
                
                // Redirect immediately (don't wait for effect)
                const target = role === 'client' ? '/client-dashboard' : '/admin-dashboard';
                console.log('[AuthContext] Login success, redirecting to:', target);
                router.replace(target);
                
                return { success: true };
            }

            setIsLoading(false);
            return { success: false, error: 'Login failed' };
        } catch (error) {
            console.error('[AuthContext] Login exception:', error);
            setIsLoading(false);
            return { success: false, error: (error as AuthError).message || 'An unexpected error occurred' };
        }
    };

    const signUp = async (email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } },
            });

            if (error) {
                setIsLoading(false);
                return { success: false, error: error.message };
            }

            if (data.user) {
                // Profile creation handled by DB trigger or loadUserSession
                return { success: true };
            }

            setIsLoading(false);
            return { success: false, error: 'Sign up failed' };
        } catch (error) {
            setIsLoading(false);
            return { success: false, error: (error as AuthError).message || 'An unexpected error occurred' };
        }
    };

    const logout = async () => {
        console.log('[AuthContext] Logging out...');
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('[AuthContext] Logout error:', err);
        }
        setUser(null);
        setProfile(null);
        router.replace('/login');
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            profile, 
            isLoading, 
            login, 
            signUp, 
            logout, 
            isAuthenticated: !!user 
        }}>
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
