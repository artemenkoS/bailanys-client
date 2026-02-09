import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../../../services/api.service";
import { useAuthStore } from "../../../stores/authStore";

export const useDeleteRoom = () => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.session?.access_token || "");

  const mutation = useMutation({
    mutationFn: (data: { roomId: string }) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return apiService.deleteRoom(accessToken, data.roomId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["my-rooms"] });
    },
  });

  const deleteRoomAsync = async (roomId: string) => {
    try {
      await mutation.mutateAsync({ roomId });
      return { ok: true as const, errorKey: null as string | null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "Room has active participants") {
        return { ok: false as const, errorKey: "rooms.errors.roomActive" };
      }
      return { ok: false as const, errorKey: "rooms.errors.deleteFailed" };
    }
  };

  return {
    deleteRoomAsync,
    isDeletingRoom: mutation.isPending,
  };
};
