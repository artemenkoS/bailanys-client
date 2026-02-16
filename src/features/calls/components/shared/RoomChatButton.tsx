import { ActionIcon, Button } from '@mantine/core';
import { IconMessage2 } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface RoomChatButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  mode?: 'icon' | 'button';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

export const RoomChatButton = ({
  onClick,
  disabled,
  className,
  mode = 'icon',
  size = 'xs',
  fullWidth,
}: RoomChatButtonProps) => {
  const { t } = useTranslation();

  if (mode === 'button') {
    return (
      <Button
        variant="light"
        size={size}
        leftSection={<IconMessage2 size={14} />}
        onClick={onClick}
        disabled={disabled}
        aria-label={t('rooms.chat')}
        title={t('rooms.chat')}
        className={className}
        fullWidth={fullWidth}
      >
        {t('rooms.chat')}
      </Button>
    );
  }

  return (
    <ActionIcon
      variant="light"
      color="indigo"
      radius="md"
      onClick={onClick}
      disabled={disabled}
      aria-label={t('rooms.chat')}
      title={t('rooms.chat')}
      className={className}
    >
      <IconMessage2 size={16} />
    </ActionIcon>
  );
};
