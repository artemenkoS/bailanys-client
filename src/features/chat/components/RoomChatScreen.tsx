import { ActionIcon, Avatar, Button, Center, Group, Loader, ScrollArea, Stack, Text, Textarea } from '@mantine/core';
import { IconArrowLeft, IconDoorEnter, IconSend } from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import { useCallStore } from '../../../stores/callStore';
import { useRoomCallStore } from '../../../stores/roomCallStore';
import type { Profile } from '../../../types/auth';
import type { RoomChatMessage } from '../../../types/roomChat';
import { RoomPasswordModal } from '../../calls/components/modals/RoomPasswordModal';
import { useMyRooms } from '../../calls/hooks/useMyRooms';
import { useRoomJoinHandler } from '../../calls/hooks/useRoomJoinHandler';
import { useRooms } from '../../calls/hooks/useRooms';
import { useOnlineUsers } from '../../contacts/hooks/useOnlineUsers';
import { useRoomChatMessages } from '../hooks/useRoomChatMessages';
import { useSendRoomChatMessage } from '../hooks/useSendRoomChatMessage';
import styles from './ChatScreen.module.css';

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const sortByCreatedAt = (messages: RoomChatMessage[]) =>
  messages.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

export const RoomChatScreen = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const accessToken = useAuthStore((state) => state.session?.access_token);
  const currentUserId = useAuthStore((state) => state.user?.id ?? '');
  const callStatus = useCallStore((state) => state.status);
  const roomStatus = useRoomCallStore((state) => state.status);
  const activeRoomId = useRoomCallStore((state) => state.roomId);
  const joinRoom = useRoomJoinHandler();
  const { data: roomsData } = useRooms();
  const { data: myRoomsData } = useMyRooms();
  const { data: onlineUsers } = useOnlineUsers();
  const [draft, setDraft] = useState('');
  const viewportRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, isError } = useRoomChatMessages(roomId ?? null);
  const { sendMessage, isSending } = useSendRoomChatMessage(roomId ?? null);

  const rooms = useMemo(() => roomsData?.rooms ?? [], [roomsData?.rooms]);
  const myRooms = useMemo(() => myRoomsData?.rooms ?? [], [myRoomsData?.rooms]);

  const currentRoom = useMemo(() => {
    if (!roomId) return null;
    return rooms.find((room) => room.id === roomId) ?? myRooms.find((room) => room.id === roomId) ?? null;
  }, [rooms, myRooms, roomId]);

  const roomLabel = useMemo(() => {
    if (!roomId) return '';
    return currentRoom?.name ?? roomId;
  }, [currentRoom, roomId]);

  const orderedMessages = useMemo(() => sortByCreatedAt(messages), [messages]);
  const isInRoom = Boolean(activeRoomId);
  const isActionDisabled = callStatus !== 'idle' || roomStatus === 'joining' || isInRoom;

  const onlineProfilesById = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const user of onlineUsers?.users ?? []) {
      map.set(user.id, user);
    }
    return map;
  }, [onlineUsers?.users]);

  const senderIds = useMemo(() => {
    const ids = new Set<string>();
    for (const message of messages) {
      if (!message.sender_id || message.sender_id === currentUserId) continue;
      if (onlineProfilesById.has(message.sender_id)) continue;
      ids.add(message.sender_id);
    }
    return Array.from(ids);
  }, [currentUserId, messages, onlineProfilesById]);

  const senderQueries = useQueries({
    queries: senderIds.map((senderId) => ({
      queryKey: ['room-chat-user', senderId],
      enabled: Boolean(accessToken && senderId),
      queryFn: async () => apiService.getUserById(accessToken!, senderId),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const senderProfiles = useMemo(() => {
    const map = new Map(onlineProfilesById);
    for (const query of senderQueries) {
      if (query.data?.user) {
        map.set(query.data.user.id, query.data.user);
      }
    }
    return map;
  }, [onlineProfilesById, senderQueries]);

  const resolveSenderLabel = (senderId: string) => {
    const profile = senderProfiles.get(senderId);
    return profile?.display_name || profile?.username || senderId.slice(0, 8);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [orderedMessages.length]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setDraft('');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.chatScreen}>
      <RoomPasswordModal />
      <div className={styles.topBar}>
        <ActionIcon variant="subtle" color="indigo" size="lg" onClick={() => navigate('/')}
        >
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Group className={styles.peerInfo}>
          <Avatar src={currentRoom?.avatarUrl ?? undefined} size="md" radius="md" color="indigo" variant="light">
            {roomLabel?.[0]?.toUpperCase() ?? '#'}
          </Avatar>
          <div className={styles.name}>
            <Text fw={600}>{roomLabel || t('rooms.chatTitle')}</Text>
            {roomId ? (
              <Text size="xs" c="dimmed">
                {t('rooms.currentRoom', { id: roomId })}
              </Text>
            ) : null}
          </div>
        </Group>
        <div className={styles.topActions}>
          <Button
            size="sm"
            variant="light"
            leftSection={<IconDoorEnter size={16} />}
            onClick={() => {
              if (!currentRoom) return;
              navigate('/');
              joinRoom(currentRoom);
            }}
            disabled={!currentRoom || isActionDisabled}
          >
            {t('rooms.enterCall')}
          </Button>
        </div>
      </div>

      <ScrollArea
        className={styles.messages}
        viewportRef={viewportRef}
        offsetScrollbars
        classNames={{ viewport: styles.messagesViewport }}
      >
        {isLoading ? (
          <Center mih={200}>
            <Loader size="sm" />
          </Center>
        ) : isError ? (
          <Text size="sm" c="red">
            {t('chat.loadError')}
          </Text>
        ) : orderedMessages.length === 0 ? (
          <Center mih={200}>
            <Text size="sm" c="dimmed">
              {t('rooms.chatEmpty')}
            </Text>
          </Center>
        ) : (
          <Stack gap="xs">
            {orderedMessages.map((message) => {
              const isOwn = message.sender_id === currentUserId;
              const authorLabel = isOwn ? '' : resolveSenderLabel(message.sender_id);
              return (
                <div key={message.id} className={styles.messageRow}>
                  <div className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther}`}>
                    {!isOwn ? (
                      <Text size="xs" c="dimmed" className={styles.author}>
                        {authorLabel}
                      </Text>
                    ) : null}
                    <Text size="sm">{message.body}</Text>
                    <div className={styles.metaRow}>
                      <div className={styles.metaLeft}>
                        <span className={styles.timestamp}>{formatTime(message.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </Stack>
        )}
      </ScrollArea>

      <div className={styles.inputRow}>
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          placeholder={t('rooms.chatPlaceholder')}
          minRows={1}
          maxRows={2}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          classNames={{ root: styles.inputRoot, input: styles.inputField }}
        />
        <ActionIcon
          size="lg"
          color="indigo"
          variant="filled"
          onClick={handleSend}
          disabled={isSending}
          aria-label={t('rooms.chat')}
        >
          <IconSend size={16} />
        </ActionIcon>
      </div>
    </div>
  );
};
