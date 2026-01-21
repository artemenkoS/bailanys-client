export interface RegisterData {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  user_metadata: {
    username: string;
    display_name: string;
  };
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface AuthResponse {
  user: User;
  session: Session;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: "online" | "offline" | "busy" | "in-call";
  last_seen: string;
}
