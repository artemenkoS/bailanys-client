import {
  ActionIcon,
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
import { IconDoorEnter, IconPencil } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { RoomsListActions, RoomsListKey, RoomsListUi } from '../../../../stores/roomsListStore';
import { useRoomsListStore } from '../../../../stores/roomsListStore';
import type { RoomMemberSummary, RoomSummary } from '../../../../types/rooms';
import { RoomChatButton } from '../shared/RoomChatButton';
import { RoomActionsMenu } from './RoomActionsMenu';
import styles from './RoomsListSection.module.css';

interface RoomsListSectionProps<T extends RoomSummary> {
  listKey: RoomsListKey;
  title: string;
  rooms: T[];
  isLoading?: boolean;
  isError?: boolean;
  emptyText: string;
}

const RoomCard = ({
  room,
  actions,
  ui,
}: {
  room: RoomSummary | RoomMemberSummary;
  actions: RoomsListActions;
  ui: RoomsListUi;
}) => {
  const { t } = useTranslation();
  const isMemberRoom = 'isActive' in room;
  const isCreator = isMemberRoom && Boolean((room as RoomMemberSummary).isCreator);
  const isInactive = ui.showInactiveBadge && isMemberRoom && !room.isActive;
  const showChat = Boolean(actions.onChat);
  const showAvatarActions = Boolean(actions.onAvatarChange) && isCreator;
  const isAvatarUpdating = ui.avatarUpdatingRoomId === room.id;
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);

  const avatarMenu = showAvatarActions ? (
    <Menu
      withinPortal
      position="bottom-start"
      disabled={ui.isActionDisabled || isAvatarUpdating}
      opened={isAvatarMenuOpen}
      onChange={setIsAvatarMenuOpen}
    >
      <Menu.Target>
        <UnstyledButton
          aria-label={t('rooms.avatarChange')}
          disabled={ui.isActionDisabled || isAvatarUpdating}
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
              actions.onAvatarChange?.(room as RoomMemberSummary, file);
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
          disabled={!room.avatarUrl || ui.isActionDisabled || isAvatarUpdating}
          onClick={() => {
            actions.onAvatarRemove?.(room as RoomMemberSummary);
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

  const roomMenu = isMemberRoom ? (
    <RoomActionsMenu
      room={room as RoomMemberSummary}
      isMobile={ui.isMobile}
      isActionDisabled={ui.isActionDisabled}
      deleteRoomId={ui.deleteRoomId}
      actions={actions}
    />
  ) : null;

  const actionButtons = ui.isMobile ? (
    <Stack gap="xs" w="100%">
      {showChat && (
        <RoomChatButton
          mode="button"
          size="xs"
          onClick={() => actions.onChat?.(room)}
          disabled={ui.isActionDisabled}
          fullWidth
        />
      )}
      <Button
        size="xs"
        variant="light"
        leftSection={<IconDoorEnter size={14} />}
        onClick={() => actions.onJoin(room)}
        disabled={ui.isActionDisabled}
        fullWidth
      >
        {t('rooms.join')}
      </Button>
      {roomMenu}
    </Stack>
  ) : (
    <Group gap="xs" wrap="nowrap">
      {showChat && (
        <RoomChatButton
          onClick={() => actions.onChat?.(room)}
          disabled={ui.isActionDisabled}
          className={styles.actionIcon}
        />
      )}
      <ActionIcon
        variant="filled"
        color="indigo"
        radius="md"
        onClick={() => actions.onJoin(room)}
        disabled={ui.isActionDisabled}
        aria-label={t('rooms.join')}
        title={t('rooms.join')}
        className={styles.actionIcon}
      >
        <IconDoorEnter size={16} />
      </ActionIcon>
      {roomMenu}
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
              {'isCreator' in room && room.isCreator && (
                <Badge color="blue" variant="light">
                  {t('rooms.creatorBadge')}
                </Badge>
              )}
              {'role' in room && room.role === 'admin' && !('isCreator' in room && room.isCreator) && (
                <Badge color="indigo" variant="light">
                  {t('rooms.adminBadge')}
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
  listKey,
  title,
  rooms,
  isLoading,
  isError,
  emptyText,
}: RoomsListSectionProps<T>) => {
  const { t } = useTranslation();
  const actions = useRoomsListStore((state) => state.actionsByKey[listKey]);
  const ui = useRoomsListStore((state) => state.uiByKey[listKey]);

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
              actions={actions}
              ui={ui}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
};
