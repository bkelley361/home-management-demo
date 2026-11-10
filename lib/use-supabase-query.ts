import * as React from 'react';

import { supabase } from '@/lib/supabase';

type QueryState<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
};

// In-memory module cache to prevent screen flashing / unneeded skeleton states during client navigation
const queryMemoryCache = new Map<string, unknown>();

/**
 * Runs a typed RLS-constrained select and refreshes it on relevant Postgres
 * changes. Callers include home/user filters in `load`; RLS remains authoritative.
 */
export function useSupabaseQuery<T>(
  tables: string[],
  enabled: boolean,
  load: () => Promise<T>,
  deps: readonly unknown[]
): QueryState<T> {
  const tableKey = React.useMemo(() => [...new Set(tables)].sort().join(','), [tables.join(',')]);
  const cacheKey = enabled && tableKey ? `${tableKey}:${JSON.stringify(deps)}` : null;

  const [data, setData] = React.useState<T | undefined>(() => {
    if (cacheKey && queryMemoryCache.has(cacheKey)) {
      return queryMemoryCache.get(cacheKey) as T;
    }
    return undefined;
  });

  const [isLoading, setIsLoading] = React.useState(() => {
    if (!enabled) return false;
    if (cacheKey && queryMemoryCache.has(cacheKey)) return false;
    return true;
  });

  const [error, setError] = React.useState<Error | null>(null);
  const [revision, setRevision] = React.useState(0);
  const loadRef = React.useRef(load);
  loadRef.current = load;
  const refresh = React.useCallback(() => setRevision((value) => value + 1), []);

  React.useEffect(() => {
    let active = true;
    if (!enabled) {
      setData(undefined);
      setIsLoading(false);
      setError(null);
      return () => {
        active = false;
      };
    }

    // Only set isLoading to true if we don't already have data cached
    setIsLoading(!queryMemoryCache.has(cacheKey ?? ''));
    void loadRef
      .current()
      .then((nextData) => {
        if (cacheKey) {
          queryMemoryCache.set(cacheKey, nextData);
        }
        if (!active) return;
        setData(nextData);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
    // Query ownership is the caller's explicit dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, revision, tableKey, ...deps]);

  React.useEffect(() => {
    if (!enabled || !tableKey) return;
    const channel = supabase.channel(`query-${tableKey}-${Math.random().toString(36).slice(2)}`);
    for (const table of tableKey.split(',')) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    }
    channel.subscribe();
    return () => {
      if (typeof supabase?.removeChannel === 'function') {
        void supabase.removeChannel(channel);
      } else if (channel && typeof channel.unsubscribe === 'function') {
        void channel.unsubscribe();
      }
    };
  }, [enabled, tableKey, refresh]);

  return { data, isLoading, error, refresh };
}
