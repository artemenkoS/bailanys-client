import { useQuery } from '@tanstack/react-query';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';

export const useContacts = () => {
  const token = useAuthStore((state) => state.session?.access_token || '');

  return useQuery({
    queryKey: ['contacts'],
    queryFn: () => apiService.getContacts(token),
    enabled: Boolean(token),
    staleTime: 5000,
    refetchInterval: 20000,
  });
};
