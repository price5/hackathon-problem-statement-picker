import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'contest-auth-token',
    storage: window.localStorage
  },
});

// Initialize auth state from local storage
const initializeAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && localStorage.getItem('userEmail')) {
    const email = localStorage.getItem('userEmail');
    if (email) {
      try {
        // Try to sign in with stored email
        await supabase.auth.signInWithPassword({
          email,
          password: 'default-password'
        });
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear stored email if auth fails
        localStorage.removeItem('userEmail');
      }
    }
  }
};

initializeAuth();