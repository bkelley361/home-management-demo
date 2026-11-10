import { createMockSupabaseClient, mockStore } from '@/lib/mock-supabase';

export const isDemoMode = true;

/**
 * In-memory client initialized with demo data for local demonstration.
 * All queries, mutations, auth, and Realtime query subscriptions run locally.
 */
export const supabase = createMockSupabaseClient();
export const db = supabase;
export { mockStore };
