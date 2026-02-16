import { ActionIcon, Button } from '@mantine/core';
import { IconDots } from '@tabler/icons-react';
import { forwardRef } from 'react';

interface RoomMenuTargetProps {
  isMobile: boolean;
  disabled: boolean;
  label: string;
}

export const RoomMenuTarget = forwardRef<HTMLButtonElement, RoomMenuTargetProps & React.ComponentPropsWithoutRef<'button'>>(
  ({ isMobile, disabled, label, ...others }, ref) =>
    isMobile ? (
      <Button
        {...others}
        ref={ref}
        size="xs"
        variant="light"
        leftSection={<IconDots size={14} />}
        disabled={disabled}
        fullWidth
      >
        {label}
      </Button>
    ) : (
      <ActionIcon
        {...others}
        ref={ref}
        variant="light"
        size="sm"
        color="gray"
        aria-label={label}
        disabled={disabled}
      >
        <IconDots size={16} />
      </ActionIcon>
    )
);

RoomMenuTarget.displayName = 'RoomMenuTarget';
