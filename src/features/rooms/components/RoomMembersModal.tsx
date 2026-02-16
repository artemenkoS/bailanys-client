import { ActionIcon, Avatar, Badge, Button, Group, Loader, Modal, Stack, Text, Tooltip } from '@mantine/core';
import { IconCrown, IconCrownOff, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../../../stores/authStore';
import type { RoomMemberSummary } from '../../../types/rooms';
import { useRoomMembers } from '../hooks/useRoomMembers';
import { useUpdateRoomMemberRole } from '../hooks/useUpdateRoomMemberRole';

interface RoomMembersModalProps {
  opened: boolean;
  room: RoomMemberSummary | null;
  onClose: () => void;
}

export const RoomMembersModal = ({ opened, room, onClose }: RoomMembersModalProps) => {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const roomId = room?.id ?? null;
  const { data, isLoading, isError } = useRoomMembers(roomId);
  const updateRole = useUpdateRoomMemberRole();

  const members = useMemo(() => data?.members ?? [], [data?.members]);

  return (
    <Modal opened={opened} onClose={onClose} title={t('rooms.manageUsersTitle')} centered>
      <Stack gap="sm">
        {isLoading ? (
          <Group justify="center">
            <Loader size="sm" />
          </Group>
        ) : isError ? (
          <Text size="sm" c="red">
            {t('rooms.errors.loadFailed')}
          </Text>
        ) : members.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('rooms.membersEmpty')}
          </Text>
        ) : (
          <Stack gap="xs">
            {members.map((member) => {
              const displayName = member.user.display_name || member.user.username || member.user.id.slice(0, 8);
              const isAdmin = member.role === 'admin';
              const isSelf = member.user.id === currentUserId;
              const isCreator = member.isCreator;
              const isUpdating =
                updateRole.isPending &&
                updateRole.variables?.roomId === roomId &&
                updateRole.variables?.userId === member.user.id;
              const canRemove = !isCreator && !isSelf;
              const canToggleAdmin = !isCreator;

              return (
                <Group key={member.user.id} justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <Avatar src={member.user.avatar_url || undefined} size="sm" radius="md" color="indigo">
                      {member.user.username?.[0]?.toUpperCase() ?? '?'}
                    </Avatar>
                    <div>
                      <Text size="sm" fw={600} truncate="end">
                        {displayName}
                      </Text>
                      <Text size="xs" c="dimmed" truncate="end">
                        @{member.user.username}
                      </Text>
                    </div>
                  </Group>
                  <Group gap={6} wrap="nowrap">
                    {isCreator && (
                      <Badge size="xs" variant="light" color="blue">
                        {t('rooms.creatorBadge')}
                      </Badge>
                    )}
                    {isAdmin && !isCreator && (
                      <Badge size="xs" variant="light" color="indigo">
                        {t('rooms.adminBadge')}
                      </Badge>
                    )}
                    <Tooltip label={isAdmin ? t('rooms.removeAdmin') : t('rooms.makeAdmin')} withArrow>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color={isAdmin ? 'red' : 'indigo'}
                        onClick={() =>
                          updateRole.mutate({
                            roomId: roomId || '',
                            userId: member.user.id,
                          action: isAdmin ? 'demote' : 'promote',
                        })
                        }
                        disabled={!canToggleAdmin || isUpdating || !roomId}
                      >
                        {isAdmin ? <IconCrownOff size={14} /> : <IconCrown size={14} />}
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t('rooms.removeMember')} withArrow>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="red"
                        onClick={() =>
                          updateRole.mutate({
                            roomId: roomId || '',
                            userId: member.user.id,
                            action: 'remove',
                          })
                        }
                        disabled={!canRemove || isUpdating || !roomId}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              );
            })}
          </Stack>
        )}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
