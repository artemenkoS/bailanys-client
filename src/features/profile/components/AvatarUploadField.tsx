import { Button, FileInput, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

interface AvatarUploadFieldProps {
  avatarFile: File | null;
  avatarError: string | null;
  disabled: boolean;
  disableRemove: boolean;
  onChange: (file: File | null) => void;
  onRemove: () => void;
}

export const AvatarUploadField = ({
  avatarFile,
  avatarError,
  disabled,
  disableRemove,
  onChange,
  onRemove,
}: AvatarUploadFieldProps) => {
  const { t } = useTranslation();

  return (
    <Stack gap="xs">
      <FileInput
        label={t("profile.avatarLabel")}
        placeholder={t("profile.avatarPlaceholder")}
        accept="image/*"
        value={avatarFile}
        onChange={onChange}
        error={avatarError}
        clearable
        disabled={disabled}
      />
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {t("common.imageUpTo")}
        </Text>
        <Button
          variant="subtle"
          color="red"
          size="xs"
          onClick={onRemove}
          disabled={disableRemove}
        >
          {t("common.removeAvatar")}
        </Button>
      </Group>
    </Stack>
  );
};
