import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authService, type AuthUser } from "@/lib/auth";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Use authService to validate token on initial load
    return authService.isAuthenticated();
  });
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ['/api/users/me'],
    queryFn: async () => {
      try {
        const userData = await authService.getCurrentUser();
        // If we successfully got user data, we're definitely authenticated
        if (userData) {
          setIsAuthenticated(true);
        }
        return userData;
      } catch (error) {
        console.log('useAuth - getCurrentUser failed, clearing auth state');
        // Clear auth state if user fetch fails
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        throw error;
      }
    },
    enabled: !!localStorage.getItem('accessToken'), // Enable if token exists
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    // Immediately sync authentication state on mount
    const initialAuth = authService.isAuthenticated();
    console.log('useAuth - Initial auth check on mount:', initialAuth);
    setIsAuthenticated(initialAuth);
    
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      console.log('useAuth - Storage change auth check:', authenticated);
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
