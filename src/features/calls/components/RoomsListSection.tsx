import { Avatar, Badge, Button, Card, FileButton, Group, Loader, Stack, Text } from '@mantine/core';
import { IconDoorEnter } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import type { RoomOwnerSummary, RoomSummary } from '../../../types/rooms';

interface RoomsListSectionProps<T extends RoomSummary> {
  title: string;
  rooms: T[];
  isLoading?: boolean;
  isError?: boolean;
  emptyText: string;
  isMobile: boolean;
  isActionDisabled: boolean;
  onJoin: (room: RoomSummary) => void;
  onDelete?: (room: RoomOwnerSummary) => void;
  deleteRoomId?: string | null;
  onAvatarChange?: (room: RoomOwnerSummary, file: File) => void;
  onAvatarRemove?: (room: RoomOwnerSummary) => void;
  avatarUpdatingRoomId?: string | null;
  showInactiveBadge?: boolean;
}

const RoomCard = ({
  room,
  isMobile,
  isActionDisabled,
  onJoin,
  onDelete,
  deleteRoomId,
  onAvatarChange,
  onAvatarRemove,
  avatarUpdatingRoomId,
  showInactiveBadge,
}: {
  room: RoomSummary | RoomOwnerSummary;
  isMobile: boolean;
  isActionDisabled: boolean;
  onJoin: (room: RoomSummary) => void;
  onDelete?: (room: RoomOwnerSummary) => void;
  deleteRoomId?: string | null;
  onAvatarChange?: (room: RoomOwnerSummary, file: File) => void;
  onAvatarRemove?: (room: RoomOwnerSummary) => void;
  avatarUpdatingRoomId?: string | null;
  showInactiveBadge?: boolean;
}) => {
  const { t } = useTranslation();
  const isOwnerRoom = 'isActive' in room;
  const isInactive = showInactiveBadge && isOwnerRoom && !room.isActive;
  const showDelete = Boolean(onDelete);
  const showAvatarActions = Boolean(onAvatarChange) && isOwnerRoom;
  const isAvatarUpdating = avatarUpdatingRoomId === room.id;

  const avatarActions = showAvatarActions ? (
    <>
      <FileButton
        accept="image/*"
        onChange={(file) => {
          if (file) {
            onAvatarChange?.(room as RoomOwnerSummary, file);
          }
        }}
      >
        {(props) => (
          <Button
            {...props}
            size="xs"
            variant="light"
            disabled={isActionDisabled || isAvatarUpdating}
            loading={isAvatarUpdating}
          >
            {t('rooms.avatarChange')}
          </Button>
        )}
      </FileButton>
      {room.avatarUrl && onAvatarRemove && (
        <Button
          size="xs"
          color="red"
          variant="subtle"
          onClick={() => onAvatarRemove(room as RoomOwnerSummary)}
          disabled={isActionDisabled || isAvatarUpdating}
          loading={isAvatarUpdating}
        >
          {t('common.removeAvatar')}
        </Button>
      )}
    </>
  ) : null;

  const actionButtons = isMobile ? (
    <Stack gap="xs" w="100%">
      <Button
        size="xs"
        leftSection={<IconDoorEnter size={14} />}
        onClick={() => onJoin(room)}
        disabled={isActionDisabled}
        fullWidth
      >
        {t('rooms.join')}
      </Button>
      {showDelete && (
        <Button
          size="xs"
          color="red"
          variant="light"
          onClick={() => onDelete?.(room as RoomOwnerSummary)}
          loading={deleteRoomId === room.id}
          disabled={isActionDisabled}
          fullWidth
        >
          {t('rooms.delete')}
        </Button>
      )}
      {avatarActions}
    </Stack>
  ) : (
    <Group gap="xs" wrap="nowrap">
      <Button
        size="xs"
        leftSection={<IconDoorEnter size={14} />}
        onClick={() => onJoin(room)}
        disabled={isActionDisabled}
      >
        {t('rooms.join')}
      </Button>
      {showDelete && (
        <Button
          size="xs"
          color="red"
          variant="light"
          onClick={() => onDelete?.(room as RoomOwnerSummary)}
          loading={deleteRoomId === room.id}
          disabled={isActionDisabled}
        >
          {t('rooms.delete')}
        </Button>
      )}
      {avatarActions}
    </Group>
  );

  return (
    <Card key={room.id} withBorder radius="md" p="sm">
      <Group justify="space-between" align="center" wrap="wrap">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Avatar size="md" radius="md" src={room.avatarUrl || undefined} color="indigo">
            {room.name?.[0]?.toUpperCase() ?? '#'}
          </Avatar>
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" wrap="wrap">
              <Text size="sm" fw={600} truncate="end">
                {room.name}
              </Text>
              {room.isPrivate ? (
                <Badge color="red" variant="light">
                  {t('rooms.privateBadge')}
                </Badge>
              ) : (
                <Badge color="green" variant="light">
                  {t('rooms.publicBadge')}
                </Badge>
              )}
              {isInactive && (
                <Badge color="gray" variant="light">
                  {t('rooms.inactiveBadge')}
                </Badge>
              )}
            </Group>
            <Text size="xs" c="dimmed">
              {t('rooms.participants', { count: room.participants })}
            </Text>
          </Stack>
        </Group>
        {actionButtons}
      </Group>
    </Card>
  );
};

export const RoomsListSection = <T extends RoomSummary>({
  title,
  rooms,
  isLoading,
  isError,
  emptyText,
  isMobile,
  isActionDisabled,
  onJoin,
  onDelete,
  deleteRoomId,
  onAvatarChange,
  onAvatarRemove,
  avatarUpdatingRoomId,
  showInactiveBadge,
}: RoomsListSectionProps<T>) => {
  const { t } = useTranslation();

  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" fw={600}>
          {title}
        </Text>
        {isLoading && <Loader size="xs" />}
      </Group>
      {isError ? (
        <Text size="sm" c="red">
          {t('rooms.errors.loadFailed')}
        </Text>
      ) : rooms.length === 0 ? (
        <Text size="sm" c="dimmed">
          {emptyText}
        </Text>
      ) : (
        <Stack gap="xs">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              isMobile={isMobile}
              isActionDisabled={isActionDisabled}
              onJoin={onJoin}
              onDelete={onDelete}
              deleteRoomId={deleteRoomId}
              onAvatarChange={onAvatarChange}
              onAvatarRemove={onAvatarRemove}
              avatarUpdatingRoomId={avatarUpdatingRoomId}
              showInactiveBadge={showInactiveBadge}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
};
