import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ClipboardList, 
  Calendar, 
  FileText, 
  Truck, 
  Receipt, 
  Package, 
  Building, 
  FolderOpen, 
  BarChart3, 
  Settings
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProject } from "@/contexts/ProjectContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

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
    name: "Deliveries",
    href: "/deliveries",
    icon: Truck,
    roles: ["Admin", "PM", "Field"]
  },
  {
    name: "Invoices",
    href: "/invoices",
    icon: Receipt,
    roles: ["Admin", "PM", "AP"]
  },
  {
    name: "Materials",
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
  },
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

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedProject, setSelectedProject, projects, isLoadingProjects } = useProject();

  const canAccess = (roles: string[]) => {
    return user && roles.includes(user.role);
  };

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const handleNavigation = (href: string) => {
    // Don't navigate if already on the target page
    if (location.pathname === href) {
      onClose();
      return;
    }
    
    navigate(href);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" data-testid="mobile-nav-overlay">
      <div className="fixed inset-y-0 left-0 w-64 bg-sidebar shadow-xl z-50 transform transition-transform duration-300 custom-scrollbar overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">BP</span>
              </div>
              <span className="font-semibold text-sidebar-foreground">BuildProcure AI</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-mobile-nav">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Project Switcher */}
        <div className="p-4 border-b border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between p-3 h-auto bg-sidebar-accent hover:bg-sidebar-accent/80"
                data-testid="button-mobile-project-switcher"
                disabled={isLoadingProjects}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                    <FolderOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    {selectedProject ? (
                      <>
                        <div className="text-sm font-medium text-sidebar-foreground">{selectedProject.name}</div>
                        <div className="text-xs text-sidebar-foreground/70">{selectedProject.status === 'active' ? 'Active Project' : selectedProject.status}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-medium text-sidebar-foreground">
                          {isLoadingProjects ? 'Loading...' : 'All Projects'}
                        </div>
                        <div className="text-xs text-sidebar-foreground/70">View all documents</div>
                      </>
                    )}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-sidebar-foreground/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-sm" align="start">
              <DropdownMenuItem
                onClick={() => setSelectedProject(null)}
                className={cn(
                  "flex items-center space-x-3 p-3",
                  !selectedProject && "bg-accent"
                )}
                data-testid="mobile-project-all"
              >
                <div className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center">
                  <FolderOpen className="w-3 h-3 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">All Projects</div>
                  <div className="text-xs text-muted-foreground">View all documents</div>
                </div>
              </DropdownMenuItem>
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={cn(
                    "flex items-center space-x-3 p-3",
                    selectedProject?.id === project.id && "bg-accent"
                  )}
                  data-testid={`mobile-project-${project.id}`}
                >
                  <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                    <FolderOpen className="w-3 h-3 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{project.name}</div>
                    <div className="text-xs text-muted-foreground">{project.status}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
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
                data-testid={`link-mobile-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border bg-sidebar">
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
          </div>
        </div>
      </div>
    </div>
  );
}
