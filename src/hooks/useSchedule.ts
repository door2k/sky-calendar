import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfWeek, addDays, format } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { DaySchedule, SaturdaySchedule } from '../types';

export function useWeekSchedule(weekStartDate: Date) {
  const startDate = startOfWeek(weekStartDate, { weekStartsOn: 0 }); // Sunday

  return useQuery({
    queryKey: ['schedule', 'week', format(startDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const dates = Array.from({ length: 7 }, (_, i) =>
        format(addDays(startDate, i), 'yyyy-MM-dd')
      );

      // Fetch weekday schedules (Sun-Fri)
      const { data: weekdayData, error: weekdayError } = await supabase
        .from('day_schedules')
        .select('*')
        .in('date', dates.slice(0, 6));

      if (weekdayError) throw weekdayError;

      // Fetch Saturday schedule
      const { data: saturdayData, error: saturdayError } = await supabase
        .from('saturday_schedules')
        .select('*')
        .eq('date', dates[6])
        .maybeSingle();

      if (saturdayError) throw saturdayError;

      // Map data to days array
      const days = dates.slice(0, 6).map((date) => {
        return weekdayData?.find((d) => d.date === date) || null;
      });

      return {
        startDate: format(startDate, 'yyyy-MM-dd'),
        days,
        saturday: saturdayData,
      };
    },
  });
}

export function useUpdateDaySchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: Partial<DaySchedule> & { date: string }) => {
      const { data, error } = await supabase
        .from('day_schedules')
        .upsert(schedule, { onConflict: 'date' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

export function useUpdateSaturdaySchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: Partial<SaturdaySchedule> & { date: string }) => {
      const { data, error } = await supabase
        .from('saturday_schedules')
        .upsert(schedule, { onConflict: 'date' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

export function useMonthSchedule(year: number, month: number) {
  return useQuery({
    queryKey: ['schedule', 'month', year, month],
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const { data: dayData, error: dayError } = await supabase
        .from('day_schedules')
        .select('*')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      if (dayError) throw dayError;

      const { data: saturdayData, error: saturdayError } = await supabase
        .from('saturday_schedules')
        .select('*')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      if (saturdayError) throw saturdayError;

      return {
        year,
        month,
        daySchedules: dayData || [],
        saturdaySchedules: saturdayData || [],
      };
    },
  });
}
