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
        realtime: {
          params: {
            eventsPerSecond: 20,
          },
        },
      });
      return clientInstance;
    });
  }
  return clientPromise;
};

export interface RealtimeSubscriptionOptions {
  table: string;
  schema?: string;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
}

/**
 * Real-time fast WebSocket subscription helper for Supabase Postgres CDC.
 * Allows components to reactively update data without periodic polling.
 */
export function subscribeToRealtimeTable(options: RealtimeSubscriptionOptions): { unsubscribe: () => void } {
  let isUnsubscribed = false;
  let activeChannel: any = null;

  getSupabase().then((client) => {
    if (isUnsubscribed) return;
    const channelName = `rt_${options.table}_${Math.random().toString(36).slice(2, 8)}`;
    const channel = client.channel(channelName);

    channel.on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: options.schema || 'public',
        table: options.table,
        filter: options.filter,
      },
      (payload: any) => {
        if (options.onChange) options.onChange(payload);
        if (payload.eventType === 'INSERT' && options.onInsert) options.onInsert(payload.new);
        if (payload.eventType === 'UPDATE' && options.onUpdate) options.onUpdate(payload.new);
        if (payload.eventType === 'DELETE' && options.onDelete) options.onDelete(payload.old);
      }
    );

    channel.subscribe();
    activeChannel = channel;
  }).catch((err) => {
    console.warn(`Supabase realtime subscription for table ${options.table} failed:`, err);
  });

  return {
    unsubscribe: () => {
      isUnsubscribed = true;
      if (activeChannel) {
        activeChannel.unsubscribe();
      }
    },
  };
}

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

