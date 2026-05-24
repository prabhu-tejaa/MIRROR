export interface RegisterRequest {
  username: string;
  email: string;
  password?: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  username: string;
  email: string;
}

export interface AdminUserResponse {
  id: string;
  username: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  failedAttempts: number;
  lockedUntil: string | null;
}

export interface AdminUserUpdateRequest {
  username?: string;
  email?: string;
  role?: string;
  isVerified?: boolean;
  password?: string;
  failedAttempts?: number;
  lockedUntil?: string | null;
}
