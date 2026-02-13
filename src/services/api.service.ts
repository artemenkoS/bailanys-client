import { useAuthStore } from '../stores/authStore';
import type {
  AuthResponse,
  LoginData,
  PasswordResetConfirm,
  PasswordResetRequest,
  PasswordResetResponse,
  Profile,
  RegisterData,
  UpdateProfileData,
} from '../types/auth';
import type { CallHistoryItem, CreateCallHistoryRequest } from '../types/callHistory';
import type { ChatMessage, ChatMessagesResponse, SendChatMessageRequest } from '../types/chat';
import type { ContactRequestsResponse, ContactSearchResult } from '../types/contacts';
import type { RoomOwnerSummary, RoomSummary } from '../types/rooms';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private refreshPromise: Promise<AuthResponse | null> | null = null;

  private async rawFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
    const headers = new Headers(options?.headers);
    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers,
      ...options,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const error = new Error(errorBody.error || 'Request failed');
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    return response.json();
  }

  private async refreshSession(): Promise<AuthResponse | null> {
    const refreshToken = useAuthStore.getState().session?.refresh_token;
    if (!refreshToken) return null;
    if (!this.refreshPromise) {
      this.refreshPromise = this.rawFetch<AuthResponse>('/api/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => null);
    }
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit, config?: { skipRefresh?: boolean }): Promise<T> {
    const response = await this.rawFetch<T>(endpoint, options).catch(async (error: Error & { status?: number }) => {
      if (config?.skipRefresh) {
        throw error;
      }
      if (error.status !== 401) {
        throw error;
      }

      const headers = new Headers(options?.headers);
      const authHeader = headers.get('Authorization') || '';
      const hasBearer = authHeader.startsWith('Bearer ');
      if (!hasBearer) {
        throw error;
      }

      const refreshed = await this.refreshSession();
      if (!refreshed?.session) {
        console.log('Unauthorized access - logging out');
        useAuthStore.getState().logout();
        throw error;
      }

      useAuthStore.getState().updateSession(refreshed.session);
      if (refreshed.user) {
        useAuthStore.getState().updateUser(refreshed.user);
      }

      headers.set('Authorization', `Bearer ${refreshed.session.access_token}`);
      return this.rawFetch<T>(endpoint, {
        ...options,
        headers,
      });
    });

    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.fetch<AuthResponse>('/api/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return this.fetch<AuthResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async requestPasswordReset(data: PasswordResetRequest): Promise<PasswordResetResponse> {
    return this.fetch<PasswordResetResponse>(
      '/api/password-reset',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      { skipRefresh: true }
    );
  }

  async confirmPasswordReset(data: PasswordResetConfirm): Promise<PasswordResetResponse> {
    return this.fetch<PasswordResetResponse>(
      '/api/password-reset/confirm',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      { skipRefresh: true }
    );
  }

  async getProfile(token: string): Promise<{ profile: Profile }> {
    return this.fetch<{ profile: Profile }>('/api/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getIceServers(token: string): Promise<{ iceServers: RTCIceServer[]; ttlSeconds?: number }> {
    return this.fetch<{ iceServers: RTCIceServer[]; ttlSeconds?: number }>('/api/ice-servers', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async updateProfile(token: string, data: UpdateProfileData): Promise<{ profile: Profile }> {
    const hasAvatar = Boolean(data.avatarFile);
    const hasRemoval = Boolean(data.removeAvatar);

    if (!hasAvatar && !hasRemoval) {
      return this.fetch<{ profile: Profile }>('/api/profile', {
        method: 'PATCH',
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
    if (data.username) formData.append('username', data.username);
    if (data.displayName !== undefined) {
      formData.append('displayName', data.displayName ?? '');
    }
    if (data.avatarFile) {
      formData.append('avatar', data.avatarFile);
    }
    if (data.removeAvatar) {
      formData.append('removeAvatar', 'true');
    }

    return this.fetch<{ profile: Profile }>('/api/profile', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  }

  async getOnlineUsers(token: string): Promise<{ users: Profile[] }> {
    return this.fetch<{ users: Profile[] }>('/api/users', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getContacts(token: string): Promise<{ contacts: Profile[] }> {
    return this.fetch<{ contacts: Profile[] }>('/api/contacts', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async searchContacts(token: string, query: string): Promise<{ users: ContactSearchResult[] }> {
    return this.fetch<{ users: ContactSearchResult[] }>(`/api/contacts/search?query=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getContactRequests(token: string): Promise<ContactRequestsResponse> {
    return this.fetch<ContactRequestsResponse>('/api/contacts/requests', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createContactRequest(token: string, targetId: string): Promise<{ request: unknown }> {
    return this.fetch<{ request: unknown }>('/api/contacts/requests', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetId }),
    });
  }

  async updateContactRequest(
    token: string,
    requestId: string,
    action: 'accept' | 'decline' | 'cancel'
  ): Promise<{ request: unknown }> {
    return this.fetch<{ request: unknown }>('/api/contacts/requests', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ requestId, action }),
    });
  }

  async getUserById(token: string, userId: string): Promise<{ user: Profile }> {
    return this.fetch<{ user: Profile }>(`/api/user?id=${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getChatMessages(token: string, peerId: string): Promise<ChatMessagesResponse> {
    return this.fetch<ChatMessagesResponse>(`/api/messages?peerId=${encodeURIComponent(peerId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async sendChatMessage(token: string, data: SendChatMessageRequest): Promise<{ message: ChatMessage }> {
    return this.fetch<{ message: ChatMessage }>('/api/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async updateChatMessage(token: string, id: string, body: string): Promise<{ message: ChatMessage }> {
    return this.fetch<{ message: ChatMessage }>('/api/messages', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, body }),
    });
  }

  async deleteChatMessage(token: string, id: string): Promise<{ message: ChatMessage }> {
    return this.fetch<{ message: ChatMessage }>(`/api/messages?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getCallHistory(token: string): Promise<{ calls: CallHistoryItem[] }> {
    return this.fetch<{ calls: CallHistoryItem[] }>('/api/call-history', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createCallHistory(token: string, data: CreateCallHistoryRequest): Promise<{ ok: boolean }> {
    return this.fetch<{ ok: boolean }>('/api/call-history', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async getRooms(token: string): Promise<{ rooms: RoomSummary[] }> {
    return this.fetch<{ rooms: RoomSummary[] }>('/api/rooms', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getMyRooms(token: string): Promise<{ rooms: RoomOwnerSummary[] }> {
    return this.fetch<{ rooms: RoomOwnerSummary[] }>('/api/rooms/mine', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async updateRoomAvatar(
    token: string,
    data: { roomId: string; avatarFile?: File | null; removeAvatar?: boolean }
  ): Promise<{ ok: boolean; avatarUrl?: string | null }> {
    const formData = new FormData();
    formData.append('roomId', data.roomId);
    if (data.avatarFile) {
      formData.append('avatar', data.avatarFile);
    }
    if (data.removeAvatar) {
      formData.append('removeAvatar', 'true');
    }

    return this.fetch<{ ok: boolean; avatarUrl?: string | null }>('/api/rooms', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  }

  async deleteRoom(token: string, roomId: string): Promise<{ ok: boolean }> {
    return this.fetch<{ ok: boolean }>('/api/rooms', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: roomId }),
    });
  }
}

export const apiService = new ApiService();
