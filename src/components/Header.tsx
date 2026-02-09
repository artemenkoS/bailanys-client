import { AppShell, Group, Burger, Title, rem, Text } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useOnlineUsers } from '../features/contacts/hooks/useOnlineUsers';

interface HeaderProps {
  opened: boolean;
  toggle: () => void;
}

export const Header = ({ opened, toggle }: HeaderProps) => {
  const { t } = useTranslation();

  const { data } = useOnlineUsers();

  return (
    <AppShell.Header p="md">
      <Group justify="space-between" h="100%" wrap="nowrap">
        <Group>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Title order={3} c="indigo.4" style={{ fontSize: rem(20) }}>
            Bailanys
          </Title>
        </Group>
        <Group gap="xs">
          <Group gap="xs" visibleFrom="xs">
            <IconUsers size={18} color="gray" />
            <Text size="sm" c="dimmed" fw={500}>
              {t('header.onlineCount', { count: data?.users.length || 0 })}
            </Text>
          </Group>
          <LanguageSwitcher />
        </Group>
      </Group>
    </AppShell.Header>
  );
};
