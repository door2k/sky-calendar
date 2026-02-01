import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfWeek, addDays, format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { isLastFridayOfMonth } from '../lib/dateUtils';
import type { DaySchedule, SaturdaySchedule } from '../types';
import { translateFields, translateSaturdayActivities } from '../lib/translate';

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
      const toTranslate: Record<string, string> = {};
      if (schedule.gan_activity) toTranslate.gan_activity = schedule.gan_activity;
      if (schedule.no_gan_reason) toTranslate.no_gan_reason = schedule.no_gan_reason;
      if (schedule.notes) toTranslate.notes = schedule.notes;
      if (Object.keys(toTranslate).length > 0) {
        const he = await translateFields(toTranslate);
        if (he.gan_activity) schedule.gan_activity_he = he.gan_activity;
        if (he.no_gan_reason) schedule.no_gan_reason_he = he.no_gan_reason;
        if (he.notes) schedule.notes_he = he.notes;
      }

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
      if (schedule.notes) {
        const he = await translateFields({ notes: schedule.notes });
        if (he.notes) schedule.notes_he = he.notes;
      }
      if (schedule.activities && schedule.activities.length > 0) {
        schedule.activities_he = await translateSaturdayActivities(schedule.activities);
      }

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
