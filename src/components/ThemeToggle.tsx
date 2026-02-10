import type { ActionIconProps } from '@mantine/core';
import { ActionIcon } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { useThemeStore } from '../stores/themeStore';

const iconSizeMap: Record<string, number> = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 22,
};

type ThemeToggleProps = Omit<ActionIconProps, 'children' | 'onClick' | 'aria-label' | 'title'>;

export const ThemeToggle = ({ size = 'sm', color = 'gray', variant = 'subtle', ...props }: ThemeToggleProps) => {
  const { t } = useTranslation();
  const { colorScheme, toggleColorScheme } = useThemeStore();
  const isDark = colorScheme === 'dark';
  const resolvedIconSize = typeof size === 'number' ? Math.round(size * 0.55) : (iconSizeMap[size] ?? 16);

  return (
    <ActionIcon
      variant={variant}
      color={color}
      size={size}
      onClick={toggleColorScheme}
      aria-label={t('common.theme')}
      title={isDark ? t('common.light') : t('common.dark')}
      {...props}
    >
      {isDark ? <IconSun size={resolvedIconSize} /> : <IconMoon size={resolvedIconSize} />}
    </ActionIcon>
  );
};
