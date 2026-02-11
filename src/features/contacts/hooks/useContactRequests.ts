import { useQuery } from '@tanstack/react-query';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';

export const useContactRequests = () => {
  const token = useAuthStore((state) => state.session?.access_token || '');

  return useQuery({
    queryKey: ['contact-requests'],
    queryFn: () => apiService.getContactRequests(token),
    enabled: Boolean(token),
    staleTime: 5000,
    refetchInterval: 15000,
  });
};
