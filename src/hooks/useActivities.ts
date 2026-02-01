import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Activity } from '../types';
import { translateFields } from '../lib/translate';

export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: async (): Promise<Activity[]> => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: Omit<Activity, 'id'>) => {
      const toTranslate: Record<string, string> = {};
      if (activity.name) toTranslate.name = activity.name;
      if (activity.note) toTranslate.note = activity.note;
      if (activity.address) toTranslate.address = activity.address;
      if (Object.keys(toTranslate).length > 0) {
        const he = await translateFields(toTranslate);
        if (he.name) (activity as any).name_he = he.name;
        if (he.note) (activity as any).note_he = he.note;
        if (he.address) (activity as any).address_he = he.address;
      }

      const { data, error } = await supabase
        .from('activities')
        .insert(activity)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: Partial<Activity> & { id: string }) => {
      const toTranslate: Record<string, string> = {};
      if (activity.name) toTranslate.name = activity.name;
      if (activity.note) toTranslate.note = activity.note;
      if (activity.address) toTranslate.address = activity.address;
      if (Object.keys(toTranslate).length > 0) {
        const he = await translateFields(toTranslate);
        if (he.name) activity.name_he = he.name;
        if (he.note) activity.note_he = he.note;
        if (he.address) activity.address_he = he.address;
      }

      const { data, error } = await supabase
        .from('activities')
        .update(activity)
        .eq('id', activity.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) => {
      // First, remove any references to this activity in day_schedules
      const { error: updateError } = await supabase
        .from('day_schedules')
        .update({ after_gan_activity_id: null, after_gan_time: null })
        .eq('after_gan_activity_id', activityId);

      if (updateError) throw updateError;

      // Then delete the activity
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
      return activityId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['monthSchedule'] });
    },
  });
}
