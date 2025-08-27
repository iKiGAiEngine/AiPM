import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Menu, Command, LogOut, User, Settings, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface TopAppBarProps {
  onMobileMenuToggle?: () => void;
  onGlobalSearchOpen?: () => void;
  pageTitle?: string;
  pageSubtitle?: string;
}

export default function TopAppBar({ onMobileMenuToggle, onGlobalSearchOpen, pageTitle, pageSubtitle }: TopAppBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [notifications] = useState(true); // Mock notification state

  // Get current demo mode status
  const { data: demoModeResponse, isLoading: demoModeLoading } = useQuery({
    queryKey: ['/api/settings/demo-mode'],
    enabled: !!user,
  });
  
  const demoMode = demoModeResponse?.enabled === true;

  // Toggle demo mode mutation
  const demoModeToggle = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch('/api/settings/demo-mode', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ enabled }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update demo mode');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Update the cache immediately for instant UI feedback
      queryClient.setQueryData(['/api/settings/demo-mode'], { enabled: variables });
      
      // Then invalidate other queries that might be affected
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rfqs'] });
      
      toast({
        title: 'Demo Mode Updated',
        description: `Demo mode has been ${variables ? 'enabled' : 'disabled'}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update demo mode setting',
        variant: 'destructive',
      });
    },
  });

  const handleLogout = () => {
    logout();
    // Navigate to login page after logout
    navigate('/login');
  };

  const handleDemoModeToggle = (enabled: boolean) => {
    demoModeToggle.mutate(enabled);
  };

  const currentPage = pageTitle || "Dashboard";
  const currentProject = pageSubtitle || "BuildProcure AI";

  return (
    <header className="bg-card border-b border-border px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onMobileMenuToggle}
            data-testid="button-mobile-menu"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Page Title */}
          <div>
            <h1 className="text-xl font-semibold text-foreground" data-testid="text-page-title">
              {currentPage}
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-current-project">
              {currentProject}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Global Search */}
          <div className="relative hidden sm:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-muted-foreground" />
            </div>
            <Input
              type="text"
              placeholder="Search projects, POs, vendors..."
              className="w-80 pl-10 pr-12 bg-muted/50 border-muted focus:bg-background"
              onClick={onGlobalSearchOpen}
              readOnly
              data-testid="input-global-search"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <kbd className="inline-flex items-center px-2 py-1 border border-border rounded text-xs font-sans font-medium text-muted-foreground bg-muted">
                <Command className="w-3 h-3 mr-1" />K
              </kbd>
            </div>
          </div>

          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="sm"
            className="sm:hidden"
            onClick={onGlobalSearchOpen}
            data-testid="button-mobile-search"
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative"
            data-testid="button-notifications"
          >
            <Bell className="w-5 h-5" />
            {notifications && (
              <span className="absolute top-1 right-1 block h-2 w-2 bg-destructive rounded-full" data-testid="indicator-unread-notifications" />
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-3 p-2 h-auto"
                data-testid="button-user-menu"
              >
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-foreground">
                    {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-medium text-foreground">
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="menu-item-profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="menu-item-settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              
              {/* Demo Mode Toggle */}
              <DropdownMenuItem 
                onSelect={(e) => e.preventDefault()}
                className="focus:bg-transparent"
                data-testid="menu-item-demo-mode"
              >
                <TestTube className="mr-2 h-4 w-4" />
                <div className="flex items-center justify-between w-full">
                  <span>Demo Mode</span>
                  <Switch
                    checked={Boolean(demoMode)}
                    onCheckedChange={handleDemoModeToggle}
                    disabled={demoModeToggle.isPending}
                    className="ml-2"
                  />
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
                data-testid="menu-item-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
