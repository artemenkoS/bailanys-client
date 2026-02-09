import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

interface RoomDeleteConfirmModalProps {
  opened: boolean;
  roomName?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const RoomDeleteConfirmModal = ({
  opened,
  roomName,
  onCancel,
  onConfirm,
  loading,
}: RoomDeleteConfirmModalProps) => {
  const { t } = useTranslation();

  return (
    <Modal opened={opened} onClose={onCancel} title={t("rooms.delete")} centered>
      <Stack gap="sm">
        <Text size="sm">
          {t("rooms.deleteConfirm", { name: roomName ?? "" })}
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button color="red" onClick={onConfirm} loading={loading}>
            {t("rooms.delete")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
