import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api.service";
import { useAuthStore } from "../stores/authStore";

export const useOnlineUsers = () => {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ["online-users"],
    queryFn: () => apiService.getOnlineUsers(session?.access_token || ""),
    enabled: !!session?.access_token,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    staleTime: 3000,
  });
};
