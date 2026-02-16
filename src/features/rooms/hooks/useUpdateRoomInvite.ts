import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';

export const useUpdateRoomInvite = () => {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation({
    mutationFn: (data: { requestId: string; action: 'accept' | 'decline' | 'cancel' }) =>
      apiService.updateRoomInvite(session?.access_token || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-invite-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-rooms'] });
    },
  });
};
