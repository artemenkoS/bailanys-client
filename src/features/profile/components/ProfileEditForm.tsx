import { Button, Group, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMemo } from "react";
import type { UpdateProfileData } from "../../../types/auth";
import { useAvatarState } from "../hooks/useAvatarState";
import { useProfile } from "../hooks/useProfile";
import { AvatarUploadField } from "./AvatarUploadField";
import { ProfilePreview } from "./ProfilePreview";
import { useTranslation } from "react-i18next";

interface ProfileEditFormProps {
  onClose: () => void;
}

export const ProfileEditForm = ({ onClose }: ProfileEditFormProps) => {
  const { t } = useTranslation();
  const { updateProfileAsync, isUpdatingProfile, profile } = useProfile();
  const {
    avatarFile,
    avatarRemoved,
    avatarError,
    avatarSrc,
    avatarChanged,
    handleAvatarChange,
    handleRemoveAvatar,
  } = useAvatarState(profile?.avatar_url);

  const form = useForm({
    initialValues: {
      username: profile?.username ?? "",
      displayName: profile?.display_name ?? "",
    },
    validate: {
      username: (value) => {
        if (!value.trim()) return t("profile.usernameRequired");
        if (value.trim().length < 4) {
          return t("auth.usernameTooShort");
        }
        return null;
      },
    },
  });

  const initialValues = useMemo(
    () => ({
      username: profile?.username ?? "",
      displayName: profile?.display_name ?? "",
    }),
    [profile?.username, profile?.display_name],
  );

  const isUnchanged =
    form.values.username.trim() === initialValues.username &&
    form.values.displayName.trim() === initialValues.displayName &&
    !avatarChanged;

  const handleSubmit = form.onSubmit(async (values) => {
    const payload: UpdateProfileData = {};
    const username = values.username.trim();
    const displayName = values.displayName.trim();

    if (username && username !== (profile?.username ?? "")) {
      payload.username = username;
    }

    if (displayName !== (profile?.display_name ?? "")) {
      payload.displayName = displayName.length > 0 ? displayName : null;
    }

    if (avatarFile) {
      payload.avatarFile = avatarFile;
    } else if (avatarRemoved) {
      payload.removeAvatar = true;
    }

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    try {
      await updateProfileAsync(payload);
      onClose();
    } catch (error) {
      console.error("Failed to update profile", error);
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <ProfilePreview
          avatarSrc={avatarSrc}
          displayName={form.values.displayName}
          username={form.values.username}
        />

        <TextInput
          withAsterisk
          label={t("profile.usernameLabel")}
          placeholder={t("profile.usernamePlaceholder")}
          {...form.getInputProps("username")}
        />

        <TextInput
          label={t("profile.displayNameLabel")}
          placeholder={t("profile.displayNamePlaceholder")}
          {...form.getInputProps("displayName")}
        />

        <AvatarUploadField
          avatarFile={avatarFile}
          avatarError={avatarError}
          onChange={handleAvatarChange}
          onRemove={handleRemoveAvatar}
          disabled={isUpdatingProfile}
          disableRemove={!profile?.avatar_url && !avatarFile}
        />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            loading={isUpdatingProfile}
            disabled={isUnchanged}
          >
            {t("common.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
