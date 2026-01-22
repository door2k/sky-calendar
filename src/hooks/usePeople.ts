import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Person } from '../types';

export function usePeople() {
  return useQuery({
    queryKey: ['people'],
    queryFn: async (): Promise<Person[]> => {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (person: Partial<Person> & { id: string }) => {
      const { data, error } = await supabase
        .from('people')
        .update(person)
        .eq('id', person.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (person: Omit<Person, 'id'>) => {
      const { data, error } = await supabase
        .from('people')
        .insert(person)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}
