import { useQuery } from '@tanstack/react-query';
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
