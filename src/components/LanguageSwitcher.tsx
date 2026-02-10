import { Box, Group, Select, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import styles from './LanguageSwitcher.module.css';

interface LanguageSwitcherProps {
  size?: 'xs' | 'sm' | 'md';
}

const SUPPORTED_LANGS = new Set(['en', 'ru', 'kk']);

const getFlagClassName = (value: string) => {
  switch (value) {
    case 'ru':
      return styles.flagRu;
    case 'kk':
      return styles.flagKk;
    case 'en':
    default:
      return styles.flagEn;
  }
};

export const LanguageSwitcher = ({ size = 'xs' }: LanguageSwitcherProps) => {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage?.split('-')[0] || i18n.language;
  const normalized = SUPPORTED_LANGS.has(current) ? current : 'en';

  const options = [
    { label: t('common.languages.en'), value: 'en' },
    { label: t('common.languages.ru'), value: 'ru' },
    { label: t('common.languages.kk'), value: 'kk' },
  ];

  const renderFlag = (value: string) => (
    <Box className={`${styles.flag} ${getFlagClassName(value)}`} />
  );

  return (
    <Select
      size={size}
      value={normalized}
      onChange={(value) => value && i18n.changeLanguage(value)}
      data={options}
      allowDeselect={false}
      w={160}
      leftSection={renderFlag(normalized)}
      renderOption={({ option }) => (
        <Group gap="xs" wrap="nowrap">
          {renderFlag(option.value)}
          <Text size="sm">{option.label}</Text>
        </Group>
      )}
    />
  );
};
