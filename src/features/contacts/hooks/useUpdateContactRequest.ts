import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';

type ContactRequestAction = 'accept' | 'decline' | 'cancel';

export const useUpdateContactRequest = () => {
  const { t } = useTranslation();
  const token = useAuthStore((state) => state.session?.access_token || '');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: ContactRequestAction }) => {
      if (!token) {
        throw new Error('Not authenticated');
      }
      return apiService.updateContactRequest(token, requestId, action);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-requests'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-search'] });
    },
    onError: (error: Error) => {
      notifications.show({
        title: t('notifications.error'),
        message: error.message || t('contacts.requestFailed'),
        color: 'red',
      });
    },
  });
};
