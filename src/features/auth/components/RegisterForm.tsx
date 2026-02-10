import { Button, Flex, Group, Stack, TextInput, Typography } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { LanguageSwitcher } from '../../../components/LanguageSwitcher';
import { useAuth } from '../hooks/useAuth';
import styles from './RegisterForm.module.css';

export const RegisterForm = () => {
  const { register, isRegistering, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const form = useForm({
    initialValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
    },

    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : t('auth.invalidEmail')),
      username: (value) => (value.length < 4 ? t('auth.usernameTooShort') : null),
      password: (value) => (value.length < 6 ? t('auth.passwordTooShort') : null),
      confirmPassword: (value, values) => (value !== values.password ? t('auth.passwordsNotMatch') : null),
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = form.onSubmit((values) => {
    register({
      email: values.email,
      username: values.username,
      password: values.password,
      displayName: values.username,
    });
  });

  return (
    <Flex
      direction="column"
      gap="lg"
      align="center"
      justify="center"
      className={styles.container}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <Stack gap="md">
          <Typography variant="h4" className={styles.title}>
            {t('auth.registerTitle')}
          </Typography>

          <TextInput
            withAsterisk
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            {...form.getInputProps('email')}
          />

          <TextInput
            withAsterisk
            label={t('auth.username')}
            placeholder={t('auth.usernamePlaceholder')}
            {...form.getInputProps('username')}
          />

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

          <Button type="submit" fullWidth loading={isRegistering} mt="md">
            {t('auth.registerButton')}
          </Button>
          <Group justify="center">
            <LanguageSwitcher size="sm" />
          </Group>

          <Button variant="subtle" fullWidth onClick={() => navigate('/login')}>
            {t('auth.gotoLogin')}
          </Button>
        </Stack>
      </form>
    </Flex>
  );
};
