import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { apiService } from "../../../services/api.service";
import { useAuthStore } from "../../../stores/authStore";
import type { UpdateProfileData } from "../../../types/auth";
import { useTranslation } from "react-i18next";

export const useProfile = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { session, isAuthenticated, updateUserMetadata } = useAuthStore();

  const profileQuery = useQuery({
    queryKey: ["profile", session?.access_token],
    queryFn: () => apiService.getProfile(session!.access_token),
    enabled: !!session?.access_token && isAuthenticated,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileData) => {
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }
      return apiService.updateProfile(session.access_token, data);
    },
    onSuccess: (response) => {
      const metadataUpdate: Partial<{
        username: string;
        display_name: string;
      }> = {};

      if (response.profile?.username) {
        metadataUpdate.username = response.profile.username;
      }
      if (response.profile) {
        metadataUpdate.display_name = response.profile.display_name ?? "";
      }

      if (Object.keys(metadataUpdate).length > 0) {
        updateUserMetadata(metadataUpdate);
      }

      queryClient.setQueryData(
        ["profile", session?.access_token],
        { profile: response.profile },
      );

      notifications.show({
        title: t("notifications.savedTitle"),
        message: t("notifications.profileUpdated"),
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: t("notifications.error"),
        message: error.message || t("notifications.profileUpdateFailed"),
        color: "red",
      });
    },
  });

  return {
    profile: profileQuery.data?.profile,
    isProfileLoading: profileQuery.isLoading,
    isProfileError: profileQuery.isError,
    refetchProfile: profileQuery.refetch,
    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
  };
};
