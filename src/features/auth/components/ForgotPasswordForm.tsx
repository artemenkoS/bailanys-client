import { Button, Flex, Group, Stack, TextInput, Typography } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { LanguageSwitcher } from '../../../components/LanguageSwitcher';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { useAuth } from '../hooks/useAuth';
import styles from './LoginForm.module.css';

export const ForgotPasswordForm = () => {
  const { requestPasswordReset, isRequestingPasswordReset } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const form = useForm({
    initialValues: {
      email: '',
    },

    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : t('auth.invalidEmail')),
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    requestPasswordReset({ email: values.email });
  });

  return (
    <Flex direction="column" gap="lg" align="center" justify="center" className={styles.container}>
      <ThemeToggle size="lg" className={styles.themeToggle} />
      <form onSubmit={handleSubmit} className={styles.form}>
        <Stack gap="md">
          <Typography variant="h4" className={styles.title}>
            {t('auth.forgotPasswordTitle')}
          </Typography>

          <TextInput
            withAsterisk
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            {...form.getInputProps('email')}
          />

          <Button type="submit" fullWidth loading={isRequestingPasswordReset} mt="md">
            {t('auth.forgotPasswordButton')}
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
