import { ActionIcon, type ActionIconProps, Tooltip, type TooltipProps } from '@mantine/core';
import { IconPhone } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import type { Profile } from '../../../types/auth';

interface AudioCallButtonProps {
  targetId?: string | null;
  status?: Profile['status'] | null;
  size?: ActionIconProps['size'];
  iconSize?: number;
  variant?: ActionIconProps['variant'];
  color?: ActionIconProps['color'];
  tooltipPosition?: TooltipProps['position'];
  disabled?: boolean;
  unknownLabel?: string;
  ariaLabel?: string;
  onCall: (targetId: string) => void;
}

const statusLabels: Record<Profile['status'], string> = {
  'in-call': 'common.inCall',
  busy: 'common.busy',
  offline: 'common.offline',
  online: 'common.online',
};

export const AudioCallButton = ({
  targetId,
  status,
  size = 'sm',
  iconSize = 14,
  variant = 'light',
  color = 'indigo',
  tooltipPosition,
  disabled,
  unknownLabel,
  ariaLabel,
  onCall,
}: AudioCallButtonProps) => {
  const { t } = useTranslation();
  const canCall = status === 'online';
  const statusKey = status ? statusLabels[status] ?? 'common.offline' : null;
  const tooltipLabel = canCall
    ? t('common.audioCall')
    : statusKey
      ? t(statusKey)
      : unknownLabel ?? t('common.offline');
  const isDisabled = Boolean(disabled) || !targetId || !canCall;

  return (
    <Tooltip label={tooltipLabel} withArrow position={tooltipPosition}>
      <ActionIcon
        variant={variant}
        color={color}
        size={size}
        onClick={() => {
          if (!targetId || isDisabled) return;
          onCall(targetId);
        }}
        disabled={isDisabled}
        aria-label={ariaLabel ?? t('common.audioCall')}
      >
        <IconPhone size={iconSize} />
      </ActionIcon>
    </Tooltip>
  );
};
