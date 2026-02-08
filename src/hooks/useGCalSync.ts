import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface GCalStatus {
  status: 'connected' | 'not_configured' | 'token_expired' | 'error';
  lastSync: string | null;
  hasSyncToken: boolean;
  mappedEvents: number;
  tokenUpdatedAt: string;
  message?: string;
}

export function useGCalSync() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const { data: status, isLoading } = useQuery<GCalStatus>({
    queryKey: ['gcal-status'],
    queryFn: async () => {
      const res = await fetch('/api/gcal/status');
      if (!res.ok) throw new Error('Failed to fetch gcal status');
      return res.json();
    },
    refetchInterval: 60_000, // poll every minute
    staleTime: 30_000,
  });

  const syncNow = async (dates?: { date: string; table: string }[]) => {
    setSyncing(true);
    try {
      if (dates && dates.length > 0) {
        await Promise.all(
          dates.map(({ date, table }) =>
            fetch('/api/gcal/sync-push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ date, table }),
            }),
          ),
        );
      }
      // Refresh status after sync
      await queryClient.invalidateQueries({ queryKey: ['gcal-status'] });
    } finally {
      setSyncing(false);
    }
  };

  return { status, isLoading, syncing, syncNow };
}
