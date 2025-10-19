import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session, RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, name: string, userType?: string, phone?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signOut: () => Promise<void>
  userProfile: any
  userRoles: string[]
  hasRole: (role: string) => boolean
  isAdmin: boolean
  updatePresence: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [presenceChannel, setPresenceChannel] = useState<RealtimeChannel | null>(null)

  // Fetch user roles from database
  const fetchUserRoles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('[AUTH] Error fetching roles:', error);
        return [];
      }

      const roles = data?.map(r => r.role) || [];
      console.log('[AUTH] User roles:', roles);
      return roles;
    } catch (error) {
      console.error('[AUTH] Critical error fetching roles:', error);
      return [];
    }
  }, []);

  // Update user presence in realtime
  const updatePresence = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          heartbeat_at: new Date().toISOString(),
          metadata: {
            page: window.location.pathname,
            userAgent: navigator.userAgent
          }
        }, {
          onConflict: 'user_id'
        });
    } catch (error) {
      console.error('[AUTH] Error updating presence:', error);
    }
  }, [user]);

  // Setup Supabase Realtime presence tracking
  const setupPresenceTracking = useCallback(async (userId: string) => {
    console.log('[AUTH] Setting up presence tracking for:', userId);

    // Clean up existing channel
    if (presenceChannel) {
      await supabase.removeChannel(presenceChannel);
    }

    // Create new presence channel
    const channel = supabase.channel(`presence:${userId}`, {
      config: {
        presence: {
          key: userId
        }
      }
    });

    // Track online status
    channel
      .on('presence', { event: 'sync' }, () => {
        console.log('[AUTH] Presence synced');
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('[AUTH] User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('[AUTH] User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString()
          });

          // Update presence in database
          await updatePresence();

          // Set up heartbeat interval
          const heartbeatInterval = setInterval(updatePresence, 30000); // Every 30 seconds

          // Store interval ID for cleanup
          (channel as any).heartbeatInterval = heartbeatInterval;
        }
      });

    setPresenceChannel(channel);

    return channel;
  }, [presenceChannel, updatePresence]);

  // Function to sync profile with database
  const syncProfileWithDatabase = async (userId: string, session: Session) => {
    console.log('[AUTH] Starting profile sync for user:', userId);
    console.log('[AUTH] Session provider:', session.user.app_metadata?.provider);
    console.log('[AUTH] User metadata:', session.user.user_metadata);
    
    try {
      // Fetch user roles
      const roles = await fetchUserRoles(userId);
      // First, check if profile exists
      console.log('[AUTH] Checking for existing profile...');
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('[AUTH] Error fetching profile:', fetchError);
      } else {
        console.log('[AUTH] Existing profile:', existingProfile ? 'found' : 'not found');
      }

      // Create profile if it doesn't exist
      if (!existingProfile && !fetchError) {
        const profileData = {
          id: userId,
          email: session.user.email,
          full_name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'مستخدم',
          display_name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'مستخدم',
          phone: session.user.user_metadata?.phone || '',
          phone_number: session.user.user_metadata?.phone || ''
        };

        console.log('[AUTH] Creating new profile:', profileData);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(profileData);

        if (insertError) {
          console.error('[AUTH] Error creating profile:', insertError);
        } else {
          console.log('[AUTH] Profile created successfully');
        }
      }

      // Fetch the latest profile data
      console.log('[AUTH] Fetching latest profile data...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('[AUTH] Error fetching profile:', profileError);
      }

      if (profile) {
        console.log('[AUTH] Profile data retrieved:', profile);
        const userProfileData = {
          id: profile.id,
          email: profile.email,
          name: profile.display_name || profile.full_name || 'مستخدم',
          phone: profile.phone || profile.phone_number,
          roles: roles
        };
        console.log('[AUTH] Setting user profile:', userProfileData);
        setUserProfile(userProfileData);
        setUserRoles(roles);

        // Setup presence tracking
        await setupPresenceTracking(userId);
      } else {
        console.log('[AUTH] No profile found, using metadata fallback');
        const fallbackProfile = {
          id: userId,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || 'مستخدم',
          roles: roles
        };
        console.log('[AUTH] Fallback profile:', fallbackProfile);
        setUserProfile(fallbackProfile);
        setUserRoles(roles);

        // Setup presence tracking
        await setupPresenceTracking(userId);
      }
    } catch (error) {
      console.error('[AUTH] Critical error syncing profile:', error);
      // Fallback to user metadata on any error
      const errorFallback = {
        id: userId,
        email: session.user.email,
        name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || 'مستخدم',
        roles: []
      };
      console.log('[AUTH] Error fallback profile:', errorFallback);
      setUserProfile(errorFallback);
      setUserRoles([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener FIRST (critical for OAuth)
    console.log('[AUTH] Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('=== [AUTH] State change detected ===');
        console.log('[AUTH] Event:', event);
        console.log('[AUTH] Timestamp:', new Date().toISOString());
        console.log('[AUTH] Session details:', {
          hasSession: !!session,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          provider: session?.user?.app_metadata?.provider,
          expiresAt: session?.expires_at
        });
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('[AUTH] ✅ User session active');
          console.log('[AUTH] User metadata:', session.user.user_metadata);
          console.log('[AUTH] App metadata:', session.user.app_metadata);
          console.log('[AUTH] Starting profile sync in background...');
          
          // Sync profile in background
          setTimeout(async () => {
            if (mounted) {
              console.log('[AUTH] Executing profile sync...');
              await syncProfileWithDatabase(session.user.id, session);
              console.log('[AUTH] Profile sync completed');
            }
          }, 0);
          
          // Handle successful sign-in - ONLY for email/password
          // OAuth sign-in is handled by AuthCallback component
          if (event === 'SIGNED_IN') {
            const provider = session.user.app_metadata?.provider;
            const currentPath = window.location.pathname;
            
            console.log('🎉 [AUTH CONTEXT] Sign in detected');
            console.log('🔑 [AUTH CONTEXT] Provider:', provider);
            console.log('📍 [AUTH CONTEXT] Current path:', currentPath);
            
            // OAuth logins are handled by AuthCallback - don't interfere!
            if (provider === 'google' || provider === 'apple') {
              // If we're already on callback page, let it handle everything
              if (currentPath === '/auth/callback') {
                console.log('ℹ️ [AUTH CONTEXT] On callback page - letting AuthCallback handle everything');
                return;
              }
              
              console.log('ℹ️ [AUTH CONTEXT] OAuth login completed, AuthCallback should have handled it');
              return;
            }
            
            // Only handle email/password logins here
            console.log('📧 [AUTH CONTEXT] Email/password login detected');
            const userName = session.user.user_metadata?.name || 
                            session.user.user_metadata?.full_name || 
                            session.user.email?.split('@')[0] || 
                            'المستخدم';
            
            toast.success(`أهلاً بك، ${userName}!`, {
              description: 'تم تسجيل الدخول بنجاح',
              duration: 3000
            });
            
            // Only redirect if not already on home page (prevents refresh loop)
            if (currentPath !== '/') {
              console.log('🚀 [AUTH CONTEXT] Redirecting to home...');
              setTimeout(() => {
                window.location.href = '/';
              }, 1000);
            } else {
              console.log('ℹ️ [AUTH CONTEXT] Already on home page, no redirect needed');
            }
          }
        } else {
          console.log('[AUTH] ⚠️ No session - user signed out or session expired');
          setUserProfile(null);
          setUserRoles([]);

          // Clean up presence tracking
          if (presenceChannel) {
            // Clear heartbeat interval
            if ((presenceChannel as any).heartbeatInterval) {
              clearInterval((presenceChannel as any).heartbeatInterval);
            }
            await supabase.removeChannel(presenceChannel);
            setPresenceChannel(null);
          }
        }
        
        setLoading(false);
      }
    );
    
    // Initialize auth by checking for existing session
    const initializeAuth = async () => {
      try {
        console.log('=== [AUTH] Initializing authentication ===');
        console.log('[AUTH] Timestamp:', new Date().toISOString());
        console.log('[AUTH] Current URL:', window.location.href);
        console.log('[AUTH] Pathname:', window.location.pathname);
        
        // Check for existing session (OAuth callback is handled by AuthCallback component)
        console.log('[AUTH] Checking for existing session...');
        const sessionCheckStart = Date.now();
        const { data: { session }, error } = await supabase.auth.getSession();
        const sessionCheckDuration = Date.now() - sessionCheckStart;
        
        console.log('[AUTH] Session check completed in:', sessionCheckDuration, 'ms');
        console.log('[AUTH] Session result:', {
          hasSession: !!session,
          hasError: !!error,
          errorMessage: error?.message,
          userId: session?.user?.id,
          userEmail: session?.user?.email
        });
        
        if (error) {
          console.error('[AUTH] ❌ Error getting session:', {
            message: error.message,
            status: error.status,
            name: error.name
          });
        }
        
        if (!mounted) {
          console.log('[AUTH] ⚠️ Component unmounted, skipping initialization');
          return;
        }
        
        if (session) {
          console.log('[AUTH] ✅ Existing session found');
          console.log('[AUTH] User email:', session.user.email);
          console.log('[AUTH] User ID:', session.user.id);
          console.log('[AUTH] Provider:', session.user.app_metadata?.provider);
          
          setSession(session);
          setUser(session.user);
          
          console.log('[AUTH] Syncing profile with database...');
          await syncProfileWithDatabase(session.user.id, session);
          console.log('[AUTH] Profile sync completed');
        } else {
          console.log('[AUTH] ℹ️ No existing session found');
        }
        
        setLoading(false);
        console.log('[AUTH] ✅ Initialization complete');
      } catch (error) {
        console.error('[AUTH] ❌ Critical error during initialization:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        if (mounted) {
          setLoading(false);
          toast.error('حدث خطأ في تسجيل الدخول');
        }
      }
    };
    
    // Start initialization
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();

      // Cleanup presence tracking
      if (presenceChannel) {
        if ((presenceChannel as any).heartbeatInterval) {
          clearInterval((presenceChannel as any).heartbeatInterval);
        }
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [fetchUserRoles, setupPresenceTracking])


  const signUp = async (email: string, password: string, name: string, userType = 'customer', phone?: string) => {
    try {
      console.log('Frontend signup attempt - auto-confirming user')
      
      // Use Supabase client with emailRedirectTo and auto-confirmation disabled
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name,
            userType,
            phone: phone || ''
          }
        }
      })
      
      if (error) throw error
      
      console.log('User signed up successfully:', data.user?.email)
      
      // Show welcome toast
      toast.success('مرحباً بك! تم إنشاء حسابك بنجاح', {
        description: 'يمكنك الآن تسجيل الدخول والاستمتاع بخدماتنا'
      })
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      // onAuthStateChange will handle the redirect
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
        
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      if (error) throw error
      
      // Toast will be shown after redirect in the auth state change listener
    } catch (error) {
      console.error('Google sign in error:', error)
      toast.error('فشل تسجيل الدخول عبر Google')
      throw error
    }
  }

  const signInWithApple = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Apple sign in error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      // Clean up presence before signing out
      if (user) {
        await supabase
          .from('user_presence')
          .delete()
          .eq('user_id', user.id);
      }

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // Redirect to home after sign out
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  // Helper functions for role checking
  const hasRole = useCallback((role: string) => {
    return userRoles.includes(role);
  }, [userRoles]);

  const isAdmin = useCallback(() => {
    return userRoles.includes('admin');
  }, [userRoles]);

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
    userProfile,
    userRoles,
    hasRole,
    isAdmin: isAdmin(),
    updatePresence
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}