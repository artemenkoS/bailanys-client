import { useQuery } from '@tanstack/react-query';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';

export const useRoomMembers = (roomId: string | null) => {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ['room-members', roomId],
    queryFn: () => apiService.getRoomMembers(session?.access_token || '', roomId || ''),
    enabled: Boolean(session?.access_token && roomId),
    staleTime: 5000,
  });
};
