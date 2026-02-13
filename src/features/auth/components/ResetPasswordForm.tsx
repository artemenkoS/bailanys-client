import { Button, Flex, Group, Stack, Text, TextInput, Typography } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { LanguageSwitcher } from '../../../components/LanguageSwitcher';
import { ThemeToggle } from '../../../components/ThemeToggle';
import type { Session } from '../../../types/auth';
import { useAuth } from '../hooks/useAuth';
import { clearRecoverySession, loadRecoverySession } from '../utils/recoverySession';
import styles from './LoginForm.module.css';

export const ResetPasswordForm = () => {
  const { confirmPasswordReset, isConfirmingPasswordReset } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recoverySession] = useState<Session | null>(() => loadRecoverySession());

  const form = useForm({
    initialValues: {
      password: '',
      confirmPassword: '',
    },

    validate: {
      password: (value) => (value.length < 6 ? t('auth.passwordTooShort') : null),
      confirmPassword: (value, values) => (value !== values.password ? t('auth.passwordsNotMatch') : null),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    if (!recoverySession) {
      notifications.show({
        title: t('notifications.error'),
        message: t('auth.resetPasswordMissing'),
        color: 'red',
      });
      return;
    }

    try {
      await confirmPasswordReset({
        accessToken: recoverySession.access_token,
        password: values.password,
      });
      clearRecoverySession();
      navigate('/login');
    } catch {
      // Errors are surfaced via the hook notifications.
    }
  });

  if (!recoverySession) {
    return (
      <Flex direction="column" gap="lg" align="center" justify="center" className={styles.container}>
        <ThemeToggle size="lg" className={styles.themeToggle} />
        <div className={styles.form}>
          <Stack gap="md">
            <Typography variant="h4" className={styles.title}>
              {t('auth.resetPasswordTitle')}
            </Typography>

            <Text>{t('auth.resetPasswordMissing')}</Text>

            <Button fullWidth onClick={() => navigate('/forgot-password')}>
              {t('auth.forgotPasswordButton')}
            </Button>

            <Button variant="subtle" fullWidth onClick={() => navigate('/login')}>
              {t('auth.backToLogin')}
            </Button>

            <Group justify="center">
              <LanguageSwitcher size="sm" />
            </Group>
          </Stack>
        </div>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="lg" align="center" justify="center" className={styles.container}>
      <ThemeToggle size="lg" className={styles.themeToggle} />
      <form onSubmit={handleSubmit} className={styles.form}>
        <Stack gap="md">
          <Typography variant="h4" className={styles.title}>
            {t('auth.resetPasswordTitle')}
          </Typography>

          <Text>{t('auth.resetPasswordFor', { email: recoverySession.user.email })}</Text>

          <TextInput
            withAsterisk
            label={t('auth.password')}
            type="password"
            placeholder={t('auth.passwordPlaceholder')}
            {...form.getInputProps('password')}
          />

          <TextInput
            withAsterisk
            label={t('auth.confirmPassword')}
            type="password"
            placeholder={t('auth.passwordPlaceholder')}
            {...form.getInputProps('confirmPassword')}
          />

          <Button type="submit" fullWidth loading={isConfirmingPasswordReset} mt="md">
            {t('auth.resetPasswordButton')}
          </Button>

          <Button variant="subtle" fullWidth onClick={() => navigate('/login')}>
            {t('auth.backToLogin')}
          </Button>

          <Group justify="center">
            <LanguageSwitcher size="sm" />
          </Group>
        </Stack>
      </form>
    </Flex>
  );
};
