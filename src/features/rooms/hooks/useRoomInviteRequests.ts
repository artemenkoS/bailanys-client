import { useQuery } from '@tanstack/react-query';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';

export const useRoomInviteRequests = () => {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ['room-invite-requests'],
    queryFn: () => apiService.getRoomInviteRequests(session?.access_token || ''),
    enabled: !!session?.access_token,
    staleTime: 5000,
  });
};
