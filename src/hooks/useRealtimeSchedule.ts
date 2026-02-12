import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useRealtimeSchedule() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('schedule-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'day_schedules' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['schedule'] });

          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            const date = (payload.new as Record<string, unknown>)?.date || (payload.old as Record<string, unknown>)?.date;
            new Notification('Sky Calendar Updated', {
              body: `Schedule for ${date} was changed`,
              icon: '/vite.svg',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saturday_schedules' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['schedule'] });

          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            const date = (payload.new as Record<string, unknown>)?.date || (payload.old as Record<string, unknown>)?.date;
            new Notification('Sky Calendar Updated', {
              body: `Saturday schedule for ${date} was changed`,
              icon: '/vite.svg',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
