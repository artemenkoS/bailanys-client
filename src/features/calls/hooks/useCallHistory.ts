import { useQuery } from "@tanstack/react-query";
import { apiService } from "../../../services/api.service";
import { useAuthStore } from "../../../stores/authStore";

export const useCallHistory = () => {
  const { session } = useAuthStore();
  const token = session?.access_token || "";

  return useQuery({
    queryKey: ["call-history"],
    queryFn: () => apiService.getCallHistory(token),
    enabled: !!token,
    staleTime: 5000,
  });
};
