import { Menu } from '@mantine/core';
import { IconLink, IconLogout, IconTrash, IconUserPlus, IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import type { RoomActionsConfig } from '../../../../stores/roomsListStore';
import type { RoomMemberSummary } from '../../../../types/rooms';
import { RoomMenuTarget } from './RoomMenuTarget';

interface RoomActionsMenuProps {
  room: RoomMemberSummary;
  isMobile: boolean;
  isActionDisabled: boolean;
  deleteRoomId?: string | null;
  actions: RoomActionsConfig;
}

export const RoomActionsMenu = ({
  room,
  isMobile,
  isActionDisabled,
  deleteRoomId,
  actions,
}: RoomActionsMenuProps) => {
  const { t } = useTranslation();
  const isCreator = room.isCreator;
  const isAdmin = room.role === 'admin' || isCreator;
  const canInvite = Boolean(actions.onInviteLink) && isAdmin;
  const canInviteUsers = Boolean(actions.onInviteUsers) && isAdmin;
  const canManage = Boolean(actions.onManageUsers) && isAdmin;
  const canDelete = Boolean(actions.onDelete) && isCreator;
  const canLeave = Boolean(actions.onLeave) && !isCreator;
  const hasActions = canInvite || canInviteUsers || canManage || canDelete || canLeave;
  if (!hasActions) return null;

  return (
    <Menu withinPortal position="bottom-end">
      <Menu.Target>
        <RoomMenuTarget isMobile={isMobile} disabled={isActionDisabled} label={t('rooms.actions')} />
      </Menu.Target>
      <Menu.Dropdown>
        {canInvite && (
          <Menu.Item
            leftSection={<IconLink size={14} />}
            onClick={() => actions.onInviteLink?.(room)}
            disabled={isActionDisabled}
          >
            {t('rooms.inviteLink')}
          </Menu.Item>
        )}
        {canInviteUsers && (
          <Menu.Item
            leftSection={<IconUserPlus size={14} />}
            onClick={() => actions.onInviteUsers?.(room)}
            disabled={isActionDisabled}
          >
            {t('rooms.inviteUsers')}
          </Menu.Item>
        )}
        {canManage && (
          <Menu.Item
            leftSection={<IconUsers size={14} />}
            onClick={() => actions.onManageUsers?.(room)}
            disabled={isActionDisabled}
          >
            {t('rooms.manageUsers')}
          </Menu.Item>
        )}
        {canDelete && (
          <Menu.Item
            leftSection={<IconTrash size={14} />}
            color="red"
            onClick={() => actions.onDelete?.(room)}
            disabled={isActionDisabled || deleteRoomId === room.id}
          >
            {t('rooms.delete')}
          </Menu.Item>
        )}
        {canLeave && (
          <Menu.Item
            leftSection={<IconLogout size={14} />}
            color="red"
            onClick={() => actions.onLeave?.(room)}
            disabled={isActionDisabled}
          >
            {t('rooms.leaveRoom')}
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};
