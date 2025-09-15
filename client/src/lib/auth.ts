import { User } from "@shared/schema";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private static instance: AuthService;
  private baseUrl = '/api';

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    
    // Store tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    
    return data;
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(`${this.baseUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // If token is expired/invalid, try to refresh before logging out
      if (response.status === 401 || response.status === 403) {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          // Retry with new token
          const retryResponse = await fetch(`${this.baseUrl}/users/me`, {
            headers: {
              'Authorization': `Bearer ${newToken}`,
            },
          });
          
          if (retryResponse.ok) {
            return await retryResponse.json();
          }
        }
        
        // Refresh failed or retry failed, logout
        this.logout();
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get current user:', error);
      // Don't logout on network errors, only on auth errors
      return null;
    }
  }

  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.logout();
        return null;
      }

      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      return data.accessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      this.logout();
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    
    // Basic token validation to prevent malformed tokens
    try {
      // JWT tokens have 3 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) {
        this.logout();
        return false;
      }
      
      // Check if token is expired
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < currentTime) {
        // Token is expired - don't logout immediately, let refresh logic handle it
        return false;
      }
      
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  hasRole(requiredRoles: string[], userRole: string): boolean {
    const roleHierarchy = {
      'Admin': 5,
      'PM': 4,
      'Purchaser': 3,
      'AP': 2,
      'Field': 1
    };

    const userRoleLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = Math.min(...requiredRoles.map(role => roleHierarchy[role as keyof typeof roleHierarchy] || 0));

    return userRoleLevel >= requiredLevel;
  }
}

export const authService = AuthService.getInstance();
