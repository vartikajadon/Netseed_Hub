import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

let clientPromise: Promise<SupabaseClient> | null = null;
let clientInstance: SupabaseClient | null = null;

export const getSupabase = async (): Promise<SupabaseClient> => {
  if (clientInstance) return clientInstance;
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return clientInstance;
    });
  }
  return clientPromise;
};

// Seamless proxy for backward compatibility with `supabase.auth.*` without blocking initial bundle
export const supabase = {
  auth: {
    getSession: async () => {
      const client = await getSupabase();
      return client.auth.getSession();
    },
    onAuthStateChange: (callback: (event: any, session: any) => void) => {
      let unsubscribeFn: (() => void) | null = null;
      let isUnsubscribed = false;

      getSupabase().then((client) => {
        if (isUnsubscribed) return;
        const { data: { subscription } } = client.auth.onAuthStateChange(callback);
        unsubscribeFn = () => subscription.unsubscribe();
      }).catch((err) => {
        console.warn('Supabase auth state change subscription failed:', err);
      });

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              isUnsubscribed = true;
              if (unsubscribeFn) {
                unsubscribeFn();
              }
            },
          },
        },
      };
    },
    signInWithPassword: async (credentials: any) => {
      const client = await getSupabase();
      return client.auth.signInWithPassword(credentials);
    },
    signOut: async () => {
      const client = await getSupabase();
      return client.auth.signOut();
    },
  },
};

