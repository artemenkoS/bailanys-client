import { ActionIcon, Avatar, Center, Group, Loader, ScrollArea, Stack, Text, Textarea } from '@mantine/core';
import { IconArrowLeft, IconSend } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuthStore } from '../../../stores/authStore';
import type { RoomChatMessage } from '../../../types/roomChat';
import { useMyRooms } from '../../calls/hooks/useMyRooms';
import { useRooms } from '../../calls/hooks/useRooms';
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
  const currentUserId = useAuthStore((state) => state.user?.id ?? '');
  const { data: roomsData } = useRooms();
  const { data: myRoomsData } = useMyRooms();
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
              return (
                <div key={message.id} className={styles.messageRow}>
                  <div className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther}`}>
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
