import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  FileButton,
  Group,
  Loader,
  Menu,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconDoorEnter, IconMessage2, IconPencil } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { RoomOwnerSummary, RoomSummary } from '../../../../types/rooms';
import styles from './RoomsListSection.module.css';

interface RoomsListSectionProps<T extends RoomSummary> {
  title: string;
  rooms: T[];
  isLoading?: boolean;
  isError?: boolean;
  emptyText: string;
  isMobile: boolean;
  isActionDisabled: boolean;
  onJoin: (room: RoomSummary) => void;
  onChat?: (room: RoomSummary) => void;
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
  onChat,
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
  onChat?: (room: RoomSummary) => void;
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
  const showChat = Boolean(onChat);
  const showAvatarActions = Boolean(onAvatarChange) && isOwnerRoom;
  const isAvatarUpdating = avatarUpdatingRoomId === room.id;
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);

  const avatarMenu = showAvatarActions ? (
    <Menu
      withinPortal
      position="bottom-start"
      disabled={isActionDisabled || isAvatarUpdating}
      opened={isAvatarMenuOpen}
      onChange={setIsAvatarMenuOpen}
    >
      <Menu.Target>
        <UnstyledButton
          aria-label={t('rooms.avatarChange')}
          disabled={isActionDisabled || isAvatarUpdating}
          className={styles.avatarButton}
        >
          <Box className={styles.avatarBox}>
            <Avatar size="md" radius="md" src={room.avatarUrl || undefined} color="indigo">
              {room.name?.[0]?.toUpperCase() ?? '#'}
            </Avatar>
            <Box className={styles.avatarOverlay}>
              <IconPencil size={14} color="white" />
            </Box>
          </Box>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <FileButton
          accept="image/*"
          onChange={(file) => {
            if (file) {
              onAvatarChange?.(room as RoomOwnerSummary, file);
              setIsAvatarMenuOpen(false);
            }
          }}
        >
          {(props) => (
            <Menu.Item {...props} closeMenuOnClick={false}>
              {t('rooms.avatarChange')}
            </Menu.Item>
          )}
        </FileButton>
        <Menu.Item
          color="red"
          disabled={!room.avatarUrl || isActionDisabled || isAvatarUpdating}
          onClick={() => {
            onAvatarRemove?.(room as RoomOwnerSummary);
            setIsAvatarMenuOpen(false);
          }}
        >
          {t('common.removeAvatar')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  ) : (
    <Avatar size="md" radius="md" src={room.avatarUrl || undefined} color="indigo">
      {room.name?.[0]?.toUpperCase() ?? '#'}
    </Avatar>
  );

  const actionButtons = isMobile ? (
    <Stack gap="xs" w="100%">
      {showChat && (
        <Button
          size="xs"
          variant="light"
          leftSection={<IconMessage2 size={14} />}
          onClick={() => onChat?.(room)}
          fullWidth
        >
          {t('rooms.chat')}
        </Button>
      )}
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
    </Stack>
  ) : (
    <Group gap="xs" wrap="nowrap">
      {showChat && (
        <Button size="xs" variant="light" leftSection={<IconMessage2 size={14} />} onClick={() => onChat?.(room)}>
          {t('rooms.chat')}
        </Button>
      )}
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
    </Group>
  );

  return (
    <Card key={room.id} withBorder radius="md" p="sm">
      <Group justify="space-between" align="center" wrap="wrap">
        <Group gap="sm" wrap="nowrap" className={styles.roomInfo}>
          {avatarMenu}
          <Stack gap={4} className={styles.roomMeta}>
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
  onChat,
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
              onChat={onChat}
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
