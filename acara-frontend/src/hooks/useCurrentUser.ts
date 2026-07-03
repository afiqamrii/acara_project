import { useQuery } from '@tanstack/react-query';
import api from '../lib/Api';

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  role: string;
  avatar_url: string | null;
  profile_completed: boolean;
  email_verified_at: string | null;
  created_at: string;
};

export const ME_QUERY_KEY = ['me'] as const;

export function useCurrentUser() {
  return useQuery<CurrentUser>({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<{ user: CurrentUser }>('/profile');
      return res.data.user;
    },
    staleTime: 5 * 60 * 1000,
  });
}
