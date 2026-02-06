import { useEffect, useMemo, useState } from "react";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

interface UseAvatarStateResult {
  avatarFile: File | null;
  avatarRemoved: boolean;
  avatarError: string | null;
  avatarSrc?: string;
  avatarChanged: boolean;
  handleAvatarChange: (file: File | null) => void;
  handleRemoveAvatar: () => void;
}

export const useAvatarState = (
  initialAvatarUrl?: string | null,
): UseAvatarStateResult => {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const avatarObjectUrl = useMemo(() => {
    if (!avatarFile) return "";
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    if (!avatarObjectUrl) return;
    return () => URL.revokeObjectURL(avatarObjectUrl);
  }, [avatarObjectUrl]);

  const handleAvatarChange = (file: File | null) => {
    setAvatarError(null);
    if (!file) {
      setAvatarFile(null);
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError("Max file size is 2MB");
      setAvatarFile(null);
      return;
    }

    setAvatarRemoved(false);
    setAvatarFile(file);
  };

  const handleRemoveAvatar = () => {
    const hasOriginal = Boolean(initialAvatarUrl);
    setAvatarRemoved(hasOriginal);
    setAvatarFile(null);
    setAvatarError(null);
  };

  const avatarSrc =
    avatarFile && avatarObjectUrl
      ? avatarObjectUrl
      : avatarRemoved
        ? undefined
        : initialAvatarUrl || undefined;

  return {
    avatarFile,
    avatarRemoved,
    avatarError,
    avatarSrc,
    avatarChanged: avatarFile !== null || avatarRemoved,
    handleAvatarChange,
    handleRemoveAvatar,
  };
};
