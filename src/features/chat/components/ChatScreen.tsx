import { ActionIcon, Avatar, Group, ScrollArea, Stack, Text, Textarea } from '@mantine/core';
import { IconArrowLeft, IconEdit, IconSend, IconTrash, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import { useCallStore } from '../../../stores/callStore';
import { useRoomCallStore } from '../../../stores/roomCallStore';
import type { Profile } from '../../../types/auth';
import type { ChatMessage } from '../../../types/chat';
import { AudioCallButton } from '../../calls/components/AudioCallButton';
import { useChatMessages } from '../hooks/useChatMessages';
import { useDeleteChatMessage } from '../hooks/useDeleteChatMessage';
import { useSendChatMessage } from '../hooks/useSendChatMessage';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import { useUpdateChatMessage } from '../hooks/useUpdateChatMessage';
import styles from './ChatScreen.module.css';

type ChatLocationState = {
  peer?: Profile;
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const sortByCreatedAt = (messages: ChatMessage[]) =>
  messages.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

export const ChatScreen = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { peerId } = useParams();
  const accessToken = useAuthStore((state) => state.session?.access_token);
  const userId = useAuthStore((state) => state.user?.id ?? '');
  const initialPeer = (location.state as ChatLocationState | null)?.peer ?? null;
  const startCall = useCallStore((state) => state.startCall);
  const callStatus = useCallStore((state) => state.status);
  const roomStatus = useRoomCallStore((state) => state.status);
  const roomId = useRoomCallStore((state) => state.roomId);
  const [draft, setDraft] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const { data: peerData } = useQuery({
    queryKey: ['chat-peer', peerId],
    enabled: Boolean(accessToken && peerId),
    queryFn: async () => {
      if (!accessToken || !peerId) return null;
      return apiService.getUserById(accessToken, peerId);
    },
  });

  const peer = useMemo(() => {
    if (peerData?.user) return peerData.user;
    if (initialPeer && initialPeer.id === peerId) return initialPeer;
    return null;
  }, [initialPeer, peerData?.user, peerId]);

  const { messages, isLoading, isError } = useChatMessages(peerId ?? null);
  const { sendMessage, isSending } = useSendChatMessage(peerId ?? null);
  const { updateMessage, isUpdating } = useUpdateChatMessage(peerId ?? null);
  const { deleteMessage, isDeleting } = useDeleteChatMessage(peerId ?? null);
  const { isPeerTyping, onInputActivity, stopTyping } = useTypingIndicator(peerId ?? null);

  const orderedMessages = useMemo(() => sortByCreatedAt(messages), [messages]);
  const isInRoom = Boolean(roomId);
  const isCallBusy = callStatus !== 'idle' || roomStatus === 'joining' || isInRoom;
  const callTargetId = peer?.id ?? peerId;
  const unknownPeerLabel = t('chat.unknownUser');

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [orderedMessages.length]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (editingMessageId) {
      updateMessage(editingMessageId, trimmed);
      setEditingMessageId(null);
      setDraft('');
      stopTyping();
      return;
    }
    sendMessage(trimmed);
    setDraft('');
    stopTyping();
  };

  const handleEdit = (message: ChatMessage) => {
    if (!message.body) return;
    setEditingMessageId(message.id);
    setDraft(message.body);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
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
        <ActionIcon variant="subtle" color="indigo" size="lg" onClick={() => navigate('/')}>
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Group className={styles.peerInfo}>
          <Avatar src={peer?.avatar_url} size="md" radius="md" color="indigo" variant="light">
            {peer?.username?.[0]?.toUpperCase() ?? '?'}
          </Avatar>
          <div className={styles.name}>
            <Text fw={600}>{peer?.display_name || peer?.username || t('chat.unknownUser')}</Text>
            {peer?.username ? (
              <Text size="xs" c="dimmed">
                @{peer.username}
              </Text>
            ) : null}
          </div>
          {isPeerTyping ? (
            <Text size="xs" c="dimmed" className={styles.typing}>
              {t('chat.typing')}
            </Text>
          ) : null}
        </Group>
        <div className={styles.topActions}>
          <AudioCallButton
            targetId={callTargetId}
            status={peer?.status}
            size="lg"
            iconSize={18}
            disabled={isCallBusy}
            unknownLabel={unknownPeerLabel}
            onCall={(id) => startCall(id, 'audio')}
          />
        </div>
      </div>

      <ScrollArea
        className={styles.messages}
        viewportRef={viewportRef}
        offsetScrollbars
        classNames={{ viewport: styles.messagesViewport }}
      >
        {isLoading ? (
          <Text size="sm" c="dimmed">
            {t('chat.loading')}
          </Text>
        ) : isError ? (
          <Text size="sm" c="red">
            {t('chat.loadError')}
          </Text>
        ) : orderedMessages.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('chat.empty')}
          </Text>
        ) : (
          <Stack gap="xs">
            {orderedMessages.map((message) => {
              const isOwn = message.sender_id === userId;
              const isDeleted = Boolean(message.deleted_at) || message.body.trim() === '';
              const displayBody = isDeleted ? t('chat.deleted') : message.body;
              return (
                <div key={message.id} className={styles.messageRow}>
                  <div className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther}`}>
                    <Text size="sm" c={isDeleted ? 'dimmed' : undefined} fs={isDeleted ? 'italic' : undefined}>
                      {displayBody}
                    </Text>
                    <div className={styles.metaRow}>
                      <div className={styles.metaLeft}>
                        <span className={styles.timestamp}>{formatTime(message.created_at)}</span>
                        {message.edited_at && !isDeleted ? (
                          <span className={styles.edited}>{t('chat.edited')}</span>
                        ) : null}
                      </div>
                      {isOwn && !isDeleted ? (
                        <div className={styles.actions}>
                          <ActionIcon variant="subtle" color="gray" size={24} onClick={() => handleEdit(message)}>
                            <IconEdit size={14} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size={24}
                            onClick={() => deleteMessage(message.id)}
                            disabled={isDeleting}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </Stack>
        )}
      </ScrollArea>

      {editingMessageId ? (
        <div className={styles.editBanner}>
          <Text size="xs" c="dimmed">
            {t('chat.editing')}
          </Text>
          <ActionIcon variant="subtle" color="gray" size={24} onClick={handleCancelEdit}>
            <IconX size={14} />
          </ActionIcon>
        </div>
      ) : null}

      <div className={styles.inputRow}>
        <Textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            onInputActivity();
          }}
          placeholder={t('chat.placeholder')}
          minRows={1}
          maxRows={1}
          onKeyDown={handleKeyDown}
          disabled={isSending || isUpdating}
          classNames={{ root: styles.inputRoot, input: styles.inputField }}
        />
        <ActionIcon
          color="indigo"
          variant="filled"
          size={42}
          onClick={handleSend}
          disabled={!draft.trim() || isSending || isUpdating}
        >
          <IconSend size={18} />
        </ActionIcon>
      </div>
    </div>
  );
};
