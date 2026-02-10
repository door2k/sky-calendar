import { useQuery } from '@tanstack/react-query';
import type { GCalExternalEvent } from '../types';

export function useExternalEvents(startDate: string, endDate: string) {
  return useQuery<GCalExternalEvent[]>({
    queryKey: ['external-events', startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/gcal/external-events?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error('Failed to fetch external events');
      return res.json();
    },
    enabled: !!startDate && !!endDate,
    staleTime: 60_000,
  });
}
