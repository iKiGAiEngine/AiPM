import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authService, type AuthUser } from "@/lib/auth";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ['/api/users/me'],
    queryFn: () => authService.getCurrentUser(),
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (!authenticated) {
        queryClient.clear();
      }
    };

    // Listen for storage changes (logout from another tab)
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, [queryClient]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      setIsAuthenticated(true);
      queryClient.setQueryData(['/api/users/me'], response.user);
      return response;
    } catch (error) {
      setIsAuthenticated(false);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    queryClient.clear();
  };

  const hasRole = (requiredRoles: string[]) => {
    if (!user) return false;
    return authService.hasRole(requiredRoles, user.role);
  };

  return {
    user: isAuthenticated ? user : null,
    isLoading: isAuthenticated ? isLoading : false,
    isAuthenticated,
    error,
    login,
    logout,
    hasRole,
  };
}
