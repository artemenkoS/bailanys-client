import { useQuery } from '@tanstack/react-query';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';

export const useMyRooms = () => {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ['my-rooms'],
    queryFn: () => apiService.getMyRooms(session?.access_token || ''),
    enabled: !!session?.access_token,
    staleTime: 5000,
  });
};
