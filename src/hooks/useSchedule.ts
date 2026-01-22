import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfWeek, addDays, format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { isLastFridayOfMonth } from '../lib/dateUtils';
import type { DaySchedule, SaturdaySchedule } from '../types';

export function useWeekSchedule(weekStartDate: Date) {
  const startDate = startOfWeek(weekStartDate, { weekStartsOn: 0 }); // Sunday

  return useQuery({
    queryKey: ['schedule', 'week', format(startDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const weekDates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
      const dates = weekDates.map((d) => format(d, 'yyyy-MM-dd'));

      // Check if Friday (index 5) is the last Friday of the month
      const fridayDate = weekDates[5];
      const fridayIsLastOfMonth = isLastFridayOfMonth(fridayDate);

      // Fetch weekday schedules (Sun-Fri)
      const { data: weekdayData, error: weekdayError } = await supabase
        .from('day_schedules')
        .select('*')
        .in('date', dates.slice(0, 6));

      if (weekdayError) throw weekdayError;

      // Fetch Saturday-style schedules (Saturday + last Friday if applicable)
      const saturdayDates = [dates[6]]; // Saturday
      if (fridayIsLastOfMonth) {
        saturdayDates.push(dates[5]); // Last Friday
      }

      const { data: saturdayStyleData, error: saturdayError } = await supabase
        .from('saturday_schedules')
        .select('*')
        .in('date', saturdayDates);

      if (saturdayError) throw saturdayError;

      // Map data to days array
      const days = dates.slice(0, 6).map((date) => {
        return weekdayData?.find((d) => d.date === date) || null;
      });

      // Find Saturday and last Friday schedules
      const saturdaySchedule = saturdayStyleData?.find((s) => s.date === dates[6]) || null;
      const lastFridaySchedule = fridayIsLastOfMonth
        ? saturdayStyleData?.find((s) => s.date === dates[5]) || null
        : null;

      return {
        startDate: format(startDate, 'yyyy-MM-dd'),
        days,
        saturday: saturdaySchedule,
        lastFriday: lastFridaySchedule,
        fridayIsLastOfMonth,
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
