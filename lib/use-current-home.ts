import * as React from 'react';

import type { Tables } from '@/lib/database.types';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useSupabaseQuery } from '@/lib/use-supabase-query';

type Home = Tables<'homes'>;
type MembershipResult = {
  home: Home;
  profileId: string;
} | null;

export function useCurrentHome() {
  const { user } = useAuth();
  const query = useSupabaseQuery<MembershipResult>(
    ['home_members', 'homes'],
    !!user,
    async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('home_members')
        .select('profile_id, homes!inner(*)')
        .eq('profile_id', user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        profileId: data.profile_id,
        home: (data as any).homes as unknown as Home,
      };
    },
    [user?.id]
  );

  return {
    home: query.data?.home ?? null,
    homeId: query.data?.home.id ?? null,
    profileId: query.data?.profileId ?? null,
    isLoading: user ? query.isLoading : false,
    error: query.error,
    refresh: query.refresh,
  };
}
