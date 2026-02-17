import { ActionIcon } from '@mantine/core';
import { IconCopy } from '@tabler/icons-react';

type NotificationCopyButtonProps = {
  onClick: () => void | Promise<void>;
  ariaLabel: string;
};

export const NotificationCopyButton = ({ onClick, ariaLabel }: NotificationCopyButtonProps) => (
  <ActionIcon
    variant="light"
    size={36}
    radius="md"
    onClick={() => onClick()}
    aria-label={ariaLabel}
  >
    <IconCopy size={20} />
  </ActionIcon>
);
