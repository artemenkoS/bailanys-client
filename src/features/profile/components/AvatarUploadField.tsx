import { Button, FileInput, Group, Stack, Text } from "@mantine/core";

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
}: AvatarUploadFieldProps) => (
  <Stack gap="xs">
    <FileInput
      label="Avatar file"
      placeholder="Upload image"
      accept="image/*"
      value={avatarFile}
      onChange={onChange}
      error={avatarError}
      clearable
      disabled={disabled}
    />
    <Group justify="space-between">
      <Text size="xs" c="dimmed">
        Image up to 2MB.
      </Text>
      <Button
        variant="subtle"
        color="red"
        size="xs"
        onClick={onRemove}
        disabled={disableRemove}
      >
        Remove avatar
      </Button>
    </Group>
  </Stack>
);
