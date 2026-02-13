import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import type { LoginData, PasswordResetConfirm, PasswordResetRequest, RegisterData } from '../../../types/auth';

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
        return;
      }

      if (response.user) {
        notifications.show({
          title: t('notifications.success'),
          message: t('notifications.registrationConfirmEmail'),
          color: 'blue',
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

  const passwordResetRequestMutation = useMutation({
    mutationFn: (data: PasswordResetRequest) => apiService.requestPasswordReset(data),
    onSuccess: () => {
      notifications.show({
        title: t('notifications.success'),
        message: t('notifications.passwordResetEmailSent'),
        color: 'blue',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: t('notifications.error'),
        message: error.message || t('notifications.passwordResetEmailFailed'),
        color: 'red',
      });
    },
  });

  const passwordResetConfirmMutation = useMutation({
    mutationFn: (data: PasswordResetConfirm) => apiService.confirmPasswordReset(data),
    onSuccess: () => {
      notifications.show({
        title: t('notifications.success'),
        message: t('notifications.passwordResetSuccess'),
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: t('notifications.error'),
        message: error.message || t('notifications.passwordResetFailed'),
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
    requestPasswordReset: passwordResetRequestMutation.mutate,
    confirmPasswordReset: passwordResetConfirmMutation.mutateAsync,
    logout,
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isRequestingPasswordReset: passwordResetRequestMutation.isPending,
    isConfirmingPasswordReset: passwordResetConfirmMutation.isPending,
  };
};
