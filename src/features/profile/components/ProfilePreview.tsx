import { Avatar, Group, Text } from "@mantine/core";

interface ProfilePreviewProps {
  avatarSrc?: string;
  displayName: string;
  username: string;
}

export const ProfilePreview = ({
  avatarSrc,
  displayName,
  username,
}: ProfilePreviewProps) => {
  const trimmedDisplayName = displayName.trim();
  const trimmedUsername = username.trim();
  const previewName = trimmedDisplayName || trimmedUsername || "No name";
  const initialSource = trimmedDisplayName || trimmedUsername || "?";

  return (
    <Group gap="sm">
      <Avatar size="lg" radius="xl" src={avatarSrc} color="indigo">
        {initialSource[0]?.toUpperCase()}
      </Avatar>
      <div>
        <Text fw={600}>Preview</Text>
        <Text size="sm" c="dimmed">
          {previewName}
        </Text>
      </div>
    </Group>
  );
};
