import { ActionIcon } from '@mantine/core';
import { IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import styles from './MuteMicButton.module.css';
interface MuteMicButtonProps {
  isMuted: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const MuteMicButton = ({ isMuted, onToggle, size = 'xl' }: MuteMicButtonProps) => {
  const { t } = useTranslation();

  return (
    <ActionIcon
      color={isMuted ? 'yellow' : 'gray'}
      size={size}
      radius="md"
      variant={isMuted ? 'filled' : 'light'}
      onClick={onToggle}
      title={isMuted ? t('common.unmuteMic') : t('common.muteMic')}
      className={styles.button}
    >
      {isMuted ? <IconMicrophoneOff size={20} /> : <IconMicrophone size={20} />}
    </ActionIcon>
  );
};
