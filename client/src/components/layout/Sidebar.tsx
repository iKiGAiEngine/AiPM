import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  ClipboardList, 
  Calendar, 
  FileText, 
  Package2,
  Truck, 
  Receipt, 
  Package, 
  Building, 
  FolderOpen, 
  BarChart3, 
  Settings,
  ChevronDown,
  GitBranch
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProject } from "@/contexts/ProjectContext";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["Admin", "PM", "Purchaser", "Field", "AP"]
  },
  {
    name: "Requisitions",
    href: "/requisitions",
    icon: ClipboardList,
    badge: "3",
    badgeVariant: "destructive" as const,
    roles: ["Admin", "PM", "Purchaser", "Field"]
  },
  {
    name: "RFQs & Quotes",
    href: "/rfqs",
    icon: Calendar,
    roles: ["Admin", "PM", "Purchaser"]
  },
  {
    name: "Purchase Orders",
    href: "/purchase-orders",
    icon: FileText,
    roles: ["Admin", "PM", "Purchaser"]
  },
  {
    name: "Change Orders",
    href: "/change-orders",
    icon: GitBranch,
    roles: ["Admin", "PM"]
  },
  {
    name: "PO Tracking",
    href: "/po-tracking",
    icon: Package2,
    roles: ["Admin", "PM", "Purchaser"]
  },
  {
    name: "Deliveries",
    href: "/deliveries",
    icon: Truck,
    roles: ["Admin", "PM", "Field"]
  },
  {
    name: "Invoices",
    href: "/invoices",
    icon: Receipt,
    badge: "2",
    badgeVariant: "secondary" as const,
    roles: ["Admin", "PM", "AP"]
  }
];

const secondaryNavigation = [
  {
    name: "Materials Catalog",
    href: "/materials",
    icon: Package,
    roles: ["Admin", "PM", "Purchaser"]
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["Admin", "PM", "Purchaser", "AP"]
  },
  {
    name: "Projects",
    href: "/projects",
    icon: FolderOpen,
    roles: ["Admin", "PM"]
  }
];

const settingsNavigation = [
  {
    name: "Vendors",
    href: "/vendors", 
    icon: Building,
    roles: ["Admin", "PM", "Purchaser"]
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["Admin", "PM"]
  }
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedProject, setSelectedProject, projects, isLoadingProjects } = useProject();
  
  // Project switching is now handled via global search (CMD+K)

  // Get project-specific counts for dynamic badges
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/dashboard/stats', selectedProject?.id],
    queryFn: async () => {
      const url = selectedProject ? `/api/dashboard/stats?projectId=${selectedProject.id}` : '/api/dashboard/stats';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user,
  });

  // Create dynamic navigation with project-specific badges
  const dynamicNavigation = navigation.map(item => {
    if (item.name === "Requisitions") {
      return {
        ...item,
        badge: dashboardStats?.openRequisitions > 0 ? dashboardStats.openRequisitions.toString() : undefined
      };
    }
    if (item.name === "Invoices") {
      return {
        ...item,
        badge: dashboardStats?.invoicesAwaitingApproval > 0 ? dashboardStats.invoicesAwaitingApproval.toString() : undefined
      };
    }
    if (item.name === "Purchase Orders") {
      return {
        ...item,
        badge: dashboardStats?.pendingPOs > 0 ? dashboardStats.pendingPOs.toString() : undefined
      };
    }
    return item;
  });

  const canAccess = (roles: string[]) => {
    return user && roles.includes(user.role);
  };

  const isActive = (href: string) => {
    // Special handling for Projects link - show as active when viewing any project detail
    if (href === "/projects") {
      return location.pathname === href || location.pathname.startsWith("/projects/");
    }
    return location.pathname === href;
  };

  const handleNavigation = (href: string) => {
    // Special handling for Projects link - redirect to current project details
    if (href === "/projects") {
      if (selectedProject && selectedProject.id) {
        const projectDetailsHref = `/projects/${selectedProject.id}`;
        // Don't navigate if already on the target project details page
        if (location.pathname === projectDetailsHref) {
          console.log(`Already on project details page: ${projectDetailsHref}`);
          return;
        }
        console.log(`Navigation clicked: Projects -> redirecting to current project details: ${projectDetailsHref}`);
        navigate(projectDetailsHref);
        return;
      } else {
        // No project selected - go to project list
        console.log(`Navigation clicked: Projects -> no project selected, going to project list`);
        navigate("/projects");
        return;
      }
    }
    
    // Don't navigate if already on the target page
    if (location.pathname === href) {
      console.log(`Already on target page: ${href}`);
      return;
    }
    
    console.log(`Navigation clicked: from ${location.pathname} to ${href}`);
    navigate(href);
  };

  // Project selection is now handled via global search

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-sidebar lg:border-r lg:border-sidebar-border lg:max-h-screen">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Logo and Brand */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">AI</span>
            </div>
            <span className="font-semibold text-sidebar-foreground">AiPM</span>
          </div>
        </div>

        {/* Current Project Display */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-3 p-3 bg-sidebar-accent rounded-lg">
            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              {selectedProject ? (
                <>
                  <div className="text-sm font-medium text-sidebar-foreground">{selectedProject.name}</div>
                  <div className="text-xs text-sidebar-foreground/70">{selectedProject.status === 'active' ? 'Active Project' : selectedProject.status}</div>
                </>
              ) : (
                <>
                  <div className="text-sm font-medium text-sidebar-foreground">
                    {isLoadingProjects ? 'Loading...' : 'No Project Selected'}
                  </div>
                  <div className="text-xs text-sidebar-foreground/70">Press ⌘K to select project</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-h-0">
          {dynamicNavigation.map((item) => {
            if (!canAccess(item.roles)) return null;
            
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left",
                  isActive(item.href)
                    ? "text-sidebar-primary-foreground bg-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <Badge variant={item.badgeVariant} className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}

          <div className="pt-2 space-y-1">
            {secondaryNavigation.map((item) => {
              if (!canAccess(item.roles)) return null;
              
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left",
                    isActive(item.href)
                      ? "text-sidebar-primary-foreground bg-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                  data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Settings at bottom */}
        <div className="p-4 border-t border-sidebar-border flex-shrink-0">
          {settingsNavigation.map((item) => {
            if (!canAccess(item.roles)) return null;
            
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left",
                  isActive(item.href)
                    ? "text-sidebar-primary-foreground bg-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                data-testid={`link-${item.name.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-foreground">
              {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">
              {user ? `${user.firstName} ${user.lastName}` : 'User'}
            </div>
            <div className="text-xs text-sidebar-foreground/70">
              {user?.role || 'Role'}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="p-1">
            <Settings className="w-4 h-4 text-sidebar-foreground/70" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
