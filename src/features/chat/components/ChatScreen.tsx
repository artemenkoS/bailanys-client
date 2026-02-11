import { ActionIcon, Avatar, Group, ScrollArea, Stack, Text, Textarea } from '@mantine/core';
import { IconArrowLeft, IconSend } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import type { Profile } from '../../../types/auth';
import type { ChatMessage } from '../../../types/chat';
import { useChatMessages } from '../hooks/useChatMessages';
import { useSendChatMessage } from '../hooks/useSendChatMessage';
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
  const [draft, setDraft] = useState('');
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

  const orderedMessages = useMemo(() => sortByCreatedAt(messages), [messages]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [orderedMessages.length]);


  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage(draft);
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
        </Group>
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
              return (
                <div key={message.id} className={styles.messageRow}>
                  <div className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther}`}>
                    <Text size="sm">{message.body}</Text>
                    <div className={styles.timestamp}>{formatTime(message.created_at)}</div>
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
          placeholder={t('chat.placeholder')}
          minRows={1}
          maxRows={1}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          classNames={{ root: styles.inputRoot, input: styles.inputField }}
        />
        <ActionIcon
          color="indigo"
          variant="filled"
          size={42}
          onClick={handleSend}
          disabled={!draft.trim() || isSending}
        >
          <IconSend size={18} />
        </ActionIcon>
      </div>
    </div>
  );
};
