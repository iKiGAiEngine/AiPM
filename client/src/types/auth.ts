export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Admin' | 'PM' | 'Purchaser' | 'Field' | 'AP';
  organizationId: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export type UserRole = AuthUser['role'];

export const roleHierarchy: Record<UserRole, number> = {
  'Admin': 5,
  'PM': 4,
  'Purchaser': 3,
  'AP': 2,
  'Field': 1,
};
