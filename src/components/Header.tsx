import { AppShell, Burger, Group, Text, Title } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { useContacts } from '../features/contacts/hooks/useContacts';
import styles from './Header.module.css';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  opened: boolean;
  toggle: () => void;
}

export const Header = ({ opened, toggle }: HeaderProps) => {
  const { t } = useTranslation();

  const { data } = useContacts();
  const onlineCount = data?.contacts?.filter((contact) => contact.status === 'online').length ?? 0;

  return (
    <AppShell.Header p="md">
      <Group justify="space-between" h="100%" wrap="nowrap">
        <Group>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Title order={3} c="indigo.4" className={styles.title}>
            Bailanys
          </Title>
        </Group>
        <Group gap="xs">
          <Group gap="xs" visibleFrom="xs">
            <IconUsers size={18} color="gray" />
            <Text size="sm" c="dimmed" fw={500}>
              {t('header.onlineCount', { count: onlineCount })}
            </Text>
          </Group>
          <ThemeToggle size="sm" />
          <LanguageSwitcher />
        </Group>
      </Group>
    </AppShell.Header>
  );
};
