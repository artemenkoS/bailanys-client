import { Button, Flex, Group, Stack, TextInput, Typography } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { LanguageSwitcher } from '../../../components/LanguageSwitcher';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { useAuth } from '../hooks/useAuth';
import styles from './LoginForm.module.css';

export const LoginForm = () => {
  const { login, isLoggingIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },

    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : t('auth.invalidEmail')),
      password: (value) => (value.length < 6 ? t('auth.passwordTooShort') : null),
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = form.onSubmit((values) => {
    login(values);
  });

  return (
    <Flex direction="column" gap="lg" align="center" justify="center" className={styles.container}>
      <ThemeToggle size="lg" className={styles.themeToggle} />
      <form onSubmit={handleSubmit} className={styles.form}>
        <Stack gap="md">
          <Typography variant="h4" className={styles.title}>
            {t('auth.loginTitle')}
          </Typography>

          <TextInput
            withAsterisk
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            {...form.getInputProps('email')}
          />

          <TextInput
            withAsterisk
            label={t('auth.password')}
            type="password"
            placeholder={t('auth.passwordPlaceholder')}
            {...form.getInputProps('password')}
          />

          <Button type="submit" fullWidth loading={isLoggingIn} mt="md">
            {t('auth.loginButton')}
          </Button>

          <Button variant="subtle" fullWidth onClick={() => navigate('/register')}>
            {t('auth.gotoRegister')}
          </Button>
          <Group justify="center">
            <LanguageSwitcher size="sm" />
          </Group>
        </Stack>
      </form>
    </Flex>
  );
};
