import {
  ActionIcon,
  Avatar,
  Badge,
  Center,
  Divider,
  Group,
  Indicator,
  Loader,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconCheck, IconMessageCircle, IconSearch, IconUserPlus, IconX } from '@tabler/icons-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Profile } from '../../../types/auth';
import type { ContactSearchResult } from '../../../types/contacts';
import { useContactRequests } from '../hooks/useContactRequests';
import { useContacts } from '../hooks/useContacts';
import { useContactSearch } from '../hooks/useContactSearch';
import { useCreateContactRequest } from '../hooks/useCreateContactRequest';
import { useUpdateContactRequest } from '../hooks/useUpdateContactRequest';
import { AudioCallButton } from '../../calls/components/AudioCallButton';
import styles from './ContactsSidebar.module.css';

interface ContactsSidebarProps {
  onStartCall: (targetId: string, type: 'audio' | 'video') => void;
  onOpenChat: (user: Profile) => void;
}

const statusLabels: Record<string, string> = {
  'in-call': 'common.inCall',
  busy: 'common.busy',
  offline: 'common.offline',
  online: 'common.online',
};

const statusColors: Record<string, string> = {
  'in-call': 'red',
  busy: 'yellow',
  offline: 'gray',
  online: 'green',
};

const getDisplayName = (user: Profile) => user.display_name || user.username;

export const ContactsSidebar = ({ onStartCall, onOpenChat }: ContactsSidebarProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [debounced] = useDebouncedValue(search, 300);
  const { data: contactsData, isLoading: isContactsLoading, isError: isContactsError } = useContacts();
  const { data: requestsData, isLoading: isRequestsLoading, isError: isRequestsError } = useContactRequests();
  const { data: searchData, isLoading: isSearchLoading, isError: isSearchError } = useContactSearch(debounced);
  const createRequest = useCreateContactRequest();
  const updateRequest = useUpdateContactRequest();

  const contacts = useMemo(() => {
    const list = contactsData?.contacts ?? [];
    const rank = (status: Profile['status']) => {
      if (status === 'online') return 0;
      if (status === 'in-call') return 1;
      if (status === 'busy') return 2;
      return 3;
    };
    return list.slice().sort((a, b) => {
      const diff = rank(a.status) - rank(b.status);
      if (diff !== 0) return diff;
      return getDisplayName(a).localeCompare(getDisplayName(b));
    });
  }, [contactsData?.contacts]);

  const searchResults = useMemo(() => searchData?.users ?? [], [searchData?.users]);
  const incomingRequests = requestsData?.incoming ?? [];
  const outgoingRequests = requestsData?.outgoing ?? [];

  const renderUserRow = (rowKey: string, user: Profile, right: ReactNode, statusOverride?: Profile['status']) => {
    const status = statusOverride ?? user.status;
    const statusKey = statusLabels[status] ?? 'common.online';
    const statusColor = statusColors[status] ?? 'green';
    return (
      <Group key={rowKey} justify="space-between" wrap="nowrap" className={styles.contactRow}>
        <Group gap="sm" wrap="nowrap" className={styles.contactMeta}>
          <Tooltip label={t(statusKey)} withArrow>
            <Indicator size={8} offset={4} position="bottom-end" color={statusColor}>
              <Avatar src={user.avatar_url} size="sm" radius="md" color="indigo" variant="light">
                {user.username?.[0]?.toUpperCase() ?? '?'}
              </Avatar>
            </Indicator>
          </Tooltip>
          <div className={styles.contactText}>
            <Text size="sm" fw={600} truncate="end">
              {getDisplayName(user)}
            </Text>
            <Text size="xs" c="dimmed" truncate="end">
              @{user.username}
            </Text>
          </div>
        </Group>
        {right}
      </Group>
    );
  };

  const renderSearchActions = (user: ContactSearchResult) => {
    if (user.relation === 'contact') {
      return (
        <Badge size="xs" variant="light" color="indigo">
          {t('contacts.inContacts')}
        </Badge>
      );
    }
    if (user.relation === 'outgoing') {
      return (
        <Badge size="xs" variant="light" color="gray">
          {t('contacts.requested')}
        </Badge>
      );
    }
    if (user.relation === 'incoming' && user.request_id) {
      return (
        <Group gap={6} wrap="nowrap">
          <Tooltip label={t('contacts.accept')} withArrow>
            <ActionIcon
              size="sm"
              color="green"
              variant="light"
              onClick={() => updateRequest.mutate({ requestId: user.request_id!, action: 'accept' })}
            >
              <IconCheck size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('contacts.decline')} withArrow>
            <ActionIcon
              size="sm"
              color="red"
              variant="light"
              onClick={() => updateRequest.mutate({ requestId: user.request_id!, action: 'decline' })}
            >
              <IconX size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      );
    }
    return (
      <Tooltip label={t('contacts.add')} withArrow>
        <ActionIcon size="md" radius="md" variant="light" color="indigo" onClick={() => createRequest.mutate(user.id)}>
          <IconUserPlus size={14} />
        </ActionIcon>
      </Tooltip>
    );
  };

  const renderContactActions = (user: Profile) => {
    return (
      <Group gap={6} wrap="nowrap">
        <Tooltip label={t('chat.open')} withArrow>
          <ActionIcon variant="light" color="indigo" size="sm" onClick={() => onOpenChat(user)}>
            <IconMessageCircle size={14} />
          </ActionIcon>
        </Tooltip>
        <AudioCallButton targetId={user.id} status={user.status} size="sm" iconSize={14} onCall={(id) => onStartCall(id, 'audio')} />
      </Group>
    );
  };

  return (
    <Stack gap="md">
      <div>
        <Text size="xs" fw={700} tt="uppercase" c="dimmed" className={styles.sectionTitle}>
          {t('contacts.searchTitle')}
        </Text>
        <TextInput
          placeholder={t('contacts.searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          leftSection={<IconSearch size={14} />}
          radius="md"
          size="sm"
        />
        {debounced.trim().length >= 2 ? (
          <div className={styles.sectionBody}>
            {isSearchLoading ? (
              <Center h={56}>
                <Loader size="sm" />
              </Center>
            ) : isSearchError ? (
              <Text size="xs" c="red">
                {t('contacts.connectionError')}
              </Text>
            ) : searchResults.length > 0 ? (
              <Stack gap="xs">
                {searchResults.map((user) =>
                  renderUserRow(user.id, user, renderSearchActions(user), user.status ?? 'offline')
                )}
              </Stack>
            ) : (
              <Text size="xs" c="dimmed">
                {t('contacts.noResults')}
              </Text>
            )}
          </div>
        ) : (
          <Text size="xs" c="dimmed" mt="xs">
            {t('contacts.searchHint')}
          </Text>
        )}
      </div>

      <Divider />

      <div>
        <Text size="xs" fw={700} tt="uppercase" c="dimmed" className={styles.sectionTitle}>
          {t('contacts.requestsTitle')}
        </Text>
        {isRequestsLoading ? (
          <Center h={56}>
            <Loader size="sm" />
          </Center>
        ) : isRequestsError ? (
          <Text size="xs" c="red">
            {t('contacts.connectionError')}
          </Text>
        ) : incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
          <Text size="xs" c="dimmed">
            {t('contacts.requestsEmpty')}
          </Text>
        ) : (
          <Stack gap="xs">
            {incomingRequests.map((request) =>
              renderUserRow(
                request.id,
                request.user,
                <Group gap={6} wrap="nowrap">
                  <Tooltip label={t('contacts.accept')} withArrow>
                    <ActionIcon
                      size="sm"
                      color="green"
                      variant="light"
                      onClick={() => updateRequest.mutate({ requestId: request.id, action: 'accept' })}
                    >
                      <IconCheck size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={t('contacts.decline')} withArrow>
                    <ActionIcon
                      size="sm"
                      color="red"
                      variant="light"
                      onClick={() => updateRequest.mutate({ requestId: request.id, action: 'decline' })}
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              )
            )}
            {outgoingRequests.map((request) =>
              renderUserRow(
                request.id,
                request.user,
                <Group gap={6} wrap="nowrap">
                  <Badge size="xs" variant="light" color="gray">
                    {t('contacts.requested')}
                  </Badge>
                  <Tooltip label={t('contacts.cancelRequest')} withArrow>
                    <ActionIcon
                      size="sm"
                      color="gray"
                      variant="light"
                      onClick={() => updateRequest.mutate({ requestId: request.id, action: 'cancel' })}
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              )
            )}
          </Stack>
        )}
      </div>

      <Divider />

      <div>
        <Group justify="space-between" align="baseline" wrap="nowrap" className={styles.sectionTitleRow}>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed" className={styles.sectionTitle}>
            {t('contacts.title')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('contacts.count', { count: contacts.length })}
          </Text>
        </Group>
        {isContactsLoading ? (
          <Center h={56}>
            <Loader size="sm" />
          </Center>
        ) : isContactsError ? (
          <Text size="xs" c="red">
            {t('contacts.connectionError')}
          </Text>
        ) : contacts.length === 0 ? (
          <Text size="xs" c="dimmed">
            {t('contacts.empty')}
          </Text>
        ) : (
          <Stack gap="xs">{contacts.map((user) => renderUserRow(user.id, user, renderContactActions(user)))}</Stack>
        )}
      </div>
    </Stack>
  );
};
