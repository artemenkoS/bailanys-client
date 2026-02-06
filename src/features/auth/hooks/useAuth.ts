import { useMutation } from "@tanstack/react-query";
import { apiService } from "../../../services/api.service";
import { useAuthStore } from "../../../stores/authStore";
import type { RegisterData, LoginData } from "../../../types/auth";
import { notifications } from "@mantine/notifications";

export const useAuth = () => {
  const {
    user,
    session,
    isAuthenticated,
    setAuth,
    logout: logoutStore,
  } = useAuthStore();

  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => apiService.register(data),
    onSuccess: (response) => {
      if (response.session && response.user) {
        setAuth(response.user, response.session);
        notifications.show({
          title: "Success",
          message: "Registration successful!",
          color: "green",
        });
      }
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Registration failed",
        color: "red",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginData) => apiService.login(data),
    onSuccess: (response) => {
      if (response.session && response.user) {
        setAuth(response.user, response.session);
        notifications.show({
          title: "Success",
          message: "Login successful!",
          color: "green",
        });
      }
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Login failed",
        color: "red",
      });
    },
  });

  const logout = () => {
    logoutStore();
    notifications.show({
      title: "Logged out",
      message: "You have been logged out",
      color: "blue",
    });
  };

  return {
    user,
    session,
    isAuthenticated,
    register: registerMutation.mutate,
    login: loginMutation.mutate,
    logout,
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
  };
};
