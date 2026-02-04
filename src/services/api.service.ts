import type {
  RegisterData,
  AuthResponse,
  LoginData,
  Profile,
} from "../types/auth";
import type {
  CallHistoryItem,
  CreateCallHistoryRequest,
} from "../types/callHistory";
import { useAuthStore } from "../stores/authStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

class ApiService {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (response.status === 401) {
      console.log("Unauthorized access - logging out");
      useAuthStore.getState().logout();
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Request failed");
    }

    return response.json();
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.fetch<AuthResponse>("/api/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return this.fetch<AuthResponse>("/api/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getProfile(token: string): Promise<{ profile: Profile }> {
    return this.fetch<{ profile: Profile }>("/api/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getOnlineUsers(token: string): Promise<{ users: Profile[] }> {
    return this.fetch<{ users: Profile[] }>("/api/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getCallHistory(token: string): Promise<{ calls: CallHistoryItem[] }> {
    return this.fetch<{ calls: CallHistoryItem[] }>("/api/call-history", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createCallHistory(
    token: string,
    data: CreateCallHistoryRequest,
  ): Promise<{ ok: boolean }> {
    return this.fetch<{ ok: boolean }>("/api/call-history", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }
}

export const apiService = new ApiService();
