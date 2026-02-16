import {
  Avatar,
  Badge,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSearch } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import type { Profile } from '../../../types/auth';
import type { RoomMemberSummary } from '../../../types/rooms';
import { useContacts } from '../../contacts/hooks/useContacts';
import { useRoomInviteRequests } from '../hooks/useRoomInviteRequests';
import { useRoomMembers } from '../hooks/useRoomMembers';
import styles from './RoomInviteUsersModal.module.css';

interface RoomInviteUsersModalProps {
  opened: boolean;
  room: RoomMemberSummary | null;
  onClose: () => void;
}

const getDisplayName = (user: Profile) => user.display_name || user.username;

export const RoomInviteUsersModal = ({ opened, room, onClose }: RoomInviteUsersModalProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.session?.access_token || '');
  const roomId = room?.id ?? '';
  const { data: contactsData, isLoading, isError } = useContacts();
  const { data: inviteRequests } = useRoomInviteRequests();
  const { data: membersData } = useRoomMembers(roomId || null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setSearch('');
    setSelectedIds([]);
    onClose();
  };

  const pendingIds = useMemo(() => {
    const pending = new Set<string>();
    (inviteRequests?.outgoing ?? []).forEach((invite) => {
      if (invite.room.id === roomId) {
        pending.add(invite.user.id);
      }
    });
    return pending;
  }, [inviteRequests?.outgoing, roomId]);

  const memberIds = useMemo(() => {
    const members = new Set<string>();
    (membersData?.members ?? []).forEach((member) => {
      members.add(member.user.id);
    });
    return members;
  }, [membersData?.members]);

  const contacts = useMemo(() => {
    const list = contactsData?.contacts ?? [];
    const query = search.trim().toLowerCase();
    return list
      .filter((user) => {
        if (!query) return true;
        const name = getDisplayName(user).toLowerCase();
        const username = user.username?.toLowerCase() ?? '';
        return name.includes(query) || username.includes(query);
      })
      .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
  }, [contactsData?.contacts, search]);

  const hasQuery = search.trim().length > 0;

  const toggleSelection = (userId: string, disabled: boolean) => {
    if (disabled) return;
    setSelectedIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const handleInvite = async () => {
    const freshToken = useAuthStore.getState().session?.access_token ?? token;
    if (!freshToken || !roomId || selectedIds.length === 0) return;
    setIsSubmitting(true);
    const targets = selectedIds.filter((id) => !pendingIds.has(id) && !memberIds.has(id));
    if (targets.length === 0) {
      setIsSubmitting(false);
      return;
    }

    const results = await Promise.allSettled(
      targets.map((targetId) => apiService.createRoomInvite(freshToken, { roomId, targetId }))
    );
    const successCount = results.filter((result) => result.status === 'fulfilled').length;
    const totalCount = targets.length;
    setIsSubmitting(false);
    setSelectedIds([]);
    queryClient.invalidateQueries({ queryKey: ['room-invite-requests'] });

    if (successCount === totalCount && successCount > 0) {
      notifications.show({
        title: t('notifications.success'),
        message: t('rooms.inviteSentCount', { count: successCount }),
        color: 'green',
      });
      handleClose();
      return;
    }

    if (successCount > 0) {
      notifications.show({
        title: t('notifications.success'),
        message: t('rooms.inviteSentPartial', { success: successCount, total: totalCount }),
        color: 'yellow',
      });
      return;
    }

    notifications.show({
      title: t('notifications.error'),
      message: t('rooms.inviteFailed'),
      color: 'red',
    });
  };

  const canSubmit = selectedIds.length > 0 && !isSubmitting && Boolean(token) && Boolean(roomId);

  return (
    <Modal
      key={roomId || 'invite-users'}
      opened={opened}
      onClose={handleClose}
      title={t('rooms.inviteUsersTitle', { name: room?.name ?? room?.id ?? '' })}
      centered
    >
      <Stack gap="sm">
        <TextInput
          className={styles.searchInput}
          placeholder={t('contacts.searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          leftSection={<IconSearch size={14} />}
          radius="md"
          size="sm"
        />
        {isLoading ? (
          <Center h={120}>
            <Loader size="sm" />
          </Center>
        ) : isError ? (
          <Text size="sm" c="red">
            {t('contacts.connectionError')}
          </Text>
        ) : contacts.length === 0 ? (
          <Text size="sm" c="dimmed">
            {hasQuery ? t('contacts.noResults') : t('contacts.empty')}
          </Text>
        ) : (
          <Stack gap="xs" className={styles.list}>
            {contacts.map((user) => {
              const isPending = pendingIds.has(user.id);
              const isMember = memberIds.has(user.id);
              const disabled = isPending || isMember || isSubmitting;
              const checked = selectedIds.includes(user.id);

              return (
                <UnstyledButton
                  key={user.id}
                  className={styles.userRow}
                  onClick={() => toggleSelection(user.id, disabled)}
                  disabled={disabled}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" className={styles.userMeta}>
                      <Checkbox
                        checked={checked}
                        onChange={() => toggleSelection(user.id, disabled)}
                        onClick={(event) => event.stopPropagation()}
                        disabled={disabled}
                      />
                      <Avatar src={user.avatar_url} size="sm" radius="md" color="indigo" variant="light">
                        {user.username?.[0]?.toUpperCase() ?? '?'}
                      </Avatar>
                      <div className={styles.userText}>
                        <Text size="sm" fw={600} truncate="end">
                          {getDisplayName(user)}
                        </Text>
                        <Text size="xs" c="dimmed" truncate="end">
                          @{user.username}
                        </Text>
                      </div>
                    </Group>
                    {isMember && (
                      <Badge size="xs" variant="light" color="gray">
                        {t('rooms.memberBadge')}
                      </Badge>
                    )}
                    {isPending && !isMember && (
                      <Badge size="xs" variant="light" color="gray">
                        {t('rooms.invitePending')}
                      </Badge>
                    )}
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>
        )}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleInvite} loading={isSubmitting} disabled={!canSubmit}>
            {t('rooms.inviteSelected')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
