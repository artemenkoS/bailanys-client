import type {
  RegisterData,
  AuthResponse,
  LoginData,
  Profile,
  UpdateProfileData,
} from "../types/auth";
import type {
  CallHistoryItem,
  CreateCallHistoryRequest,
} from "../types/callHistory";
import type { RoomOwnerSummary, RoomSummary } from "../types/rooms";
import { useAuthStore } from "../stores/authStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

class ApiService {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const isFormData =
      typeof FormData !== "undefined" && options?.body instanceof FormData;
    const headers = new Headers(options?.headers);
    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers,
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

  async updateProfile(
    token: string,
    data: UpdateProfileData,
  ): Promise<{ profile: Profile }> {
    const hasAvatar = Boolean(data.avatarFile);
    const hasRemoval = Boolean(data.removeAvatar);

    if (!hasAvatar && !hasRemoval) {
      return this.fetch<{ profile: Profile }>("/api/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: data.username,
          displayName: data.displayName,
        }),
      });
    }

    const formData = new FormData();
    if (data.username) formData.append("username", data.username);
    if (data.displayName !== undefined) {
      formData.append("displayName", data.displayName ?? "");
    }
    if (data.avatarFile) {
      formData.append("avatar", data.avatarFile);
    }
    if (data.removeAvatar) {
      formData.append("removeAvatar", "true");
    }

    return this.fetch<{ profile: Profile }>("/api/profile", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
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

  async getRooms(token: string): Promise<{ rooms: RoomSummary[] }> {
    return this.fetch<{ rooms: RoomSummary[] }>("/api/rooms", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getMyRooms(token: string): Promise<{ rooms: RoomOwnerSummary[] }> {
    return this.fetch<{ rooms: RoomOwnerSummary[] }>("/api/rooms/mine", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async updateRoomAvatar(
    token: string,
    data: { roomId: string; avatarFile?: File | null; removeAvatar?: boolean },
  ): Promise<{ ok: boolean; avatarUrl?: string | null }> {
    const formData = new FormData();
    formData.append("roomId", data.roomId);
    if (data.avatarFile) {
      formData.append("avatar", data.avatarFile);
    }
    if (data.removeAvatar) {
      formData.append("removeAvatar", "true");
    }

    return this.fetch<{ ok: boolean; avatarUrl?: string | null }>("/api/rooms", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  }

  async deleteRoom(token: string, roomId: string): Promise<{ ok: boolean }> {
    return this.fetch<{ ok: boolean }>("/api/rooms", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: roomId }),
    });
  }
}

export const apiService = new ApiService();
