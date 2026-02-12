import { ActionIcon, type ActionIconProps } from '@mantine/core';
import { IconScreenShare, IconScreenShareOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import styles from './ScreenShareButton.module.css';

interface ScreenShareButtonProps {
  isSharing: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: ActionIconProps['size'];
  className?: string;
}

export const ScreenShareButton = ({
  isSharing,
  onToggle,
  disabled,
  size = 'xl',
  className,
}: ScreenShareButtonProps) => {
  const { t } = useTranslation();
  const classes = [styles.button, className].filter(Boolean).join(' ');

  return (
    <ActionIcon
      color={isSharing ? 'blue' : 'gray'}
      size={size}
      radius="md"
      variant={isSharing ? 'filled' : 'light'}
      onClick={onToggle}
      title={isSharing ? t('common.stopShare') : t('common.shareScreen')}
      disabled={disabled}
      className={classes}
    >
      {isSharing ? <IconScreenShareOff size={20} /> : <IconScreenShare size={20} />}
    </ActionIcon>
  );
};
