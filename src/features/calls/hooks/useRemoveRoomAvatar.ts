import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../../../services/api.service";
import { useAuthStore } from "../../../stores/authStore";

export const useRemoveRoomAvatar = () => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.session?.access_token || "");

  return useMutation({
    mutationFn: (data: { roomId: string }) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return apiService.updateRoomAvatar(accessToken, {
        roomId: data.roomId,
        removeAvatar: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["my-rooms"] });
    },
  });
};
