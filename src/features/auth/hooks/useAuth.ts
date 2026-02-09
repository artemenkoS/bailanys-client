import { useMutation } from '@tanstack/react-query';
import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import type { RegisterData, LoginData } from '../../../types/auth';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';

export const useAuth = () => {
  const { t } = useTranslation();
  const { user, session, isAuthenticated, setAuth, logout: logoutStore } = useAuthStore();

  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => apiService.register(data),
    onSuccess: (response) => {
      if (response.session && response.user) {
        setAuth(response.user, response.session);
        notifications.show({
          title: t('notifications.success'),
          message: t('notifications.registrationSuccess'),
          color: 'green',
        });
      }
    },
    onError: (error: Error) => {
      notifications.show({
        title: t('notifications.error'),
        message: error.message || t('notifications.registrationFailed'),
        color: 'red',
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginData) => apiService.login(data),
    onSuccess: (response) => {
      if (response.session && response.user) {
        setAuth(response.user, response.session);
        notifications.show({
          title: t('notifications.success'),
          message: t('notifications.loginSuccess'),
          color: 'green',
        });
      }
    },
    onError: (error: Error) => {
      notifications.show({
        title: t('notifications.error'),
        message: error.message || t('notifications.loginFailed'),
        color: 'red',
      });
    },
  });

  const logout = () => {
    logoutStore();
    notifications.show({
      title: t('notifications.loggedOutTitle'),
      message: t('notifications.loggedOutMessage'),
      color: 'blue',
    });
  };

  return {
    user,
    session,
    isAuthenticated,
    register: registerMutation.mutate,
    login: loginMutation.mutate,
    logout,
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
  };
};
