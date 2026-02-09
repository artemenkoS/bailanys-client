import { Box, Group, Select, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

interface LanguageSwitcherProps {
  size?: 'xs' | 'sm' | 'md';
}

const toDataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const FLAG_URLS: Record<string, string> = {
  en: toDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 24 16">
      <rect width="24" height="16" fill="#B22234"/>
      <rect y="2" width="24" height="2" fill="#FFFFFF"/>
      <rect y="6" width="24" height="2" fill="#FFFFFF"/>
      <rect y="10" width="24" height="2" fill="#FFFFFF"/>
      <rect y="14" width="24" height="2" fill="#FFFFFF"/>
      <rect width="10" height="8" fill="#3C3B6E"/>
      <circle cx="2" cy="2" r="0.6" fill="#FFFFFF"/>
      <circle cx="4" cy="3.5" r="0.6" fill="#FFFFFF"/>
      <circle cx="6" cy="2" r="0.6" fill="#FFFFFF"/>
      <circle cx="8" cy="3.5" r="0.6" fill="#FFFFFF"/>
      <circle cx="2" cy="5.5" r="0.6" fill="#FFFFFF"/>
      <circle cx="4" cy="7" r="0.6" fill="#FFFFFF"/>
      <circle cx="6" cy="5.5" r="0.6" fill="#FFFFFF"/>
      <circle cx="8" cy="7" r="0.6" fill="#FFFFFF"/>
    </svg>`
  ),
  ru: toDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 24 16">
      <rect width="24" height="5.34" y="0" fill="#FFFFFF"/>
      <rect width="24" height="5.34" y="5.33" fill="#0039A6"/>
      <rect width="24" height="5.34" y="10.66" fill="#D52B1E"/>
    </svg>`
  ),
  kk: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Flag_of_Kazakhstan.svg',
};

export const LanguageSwitcher = ({ size = 'xs' }: LanguageSwitcherProps) => {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage?.split('-')[0] || i18n.language;
  const normalized = FLAG_URLS[current] ? current : 'en';

  const options = [
    { label: t('common.languages.en'), value: 'en' },
    { label: t('common.languages.ru'), value: 'ru' },
    { label: t('common.languages.kk'), value: 'kk' },
  ];

  const renderFlag = (value: string) => (
    <Box
      style={{
        width: 18,
        height: 12,
        borderRadius: 2,
        backgroundImage: `url(${FLAG_URLS[value] ?? FLAG_URLS.en})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        border: '1px solid var(--mantine-color-gray-3)',
      }}
    />
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
