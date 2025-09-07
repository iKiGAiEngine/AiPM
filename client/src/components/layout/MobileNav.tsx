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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  
  // Debug logging for mobile nav projects
  console.log('MobileNav - Projects:', projects.length, 'Loading:', isLoadingProjects, 'Open:', isOpen);
  

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
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
      data-testid="mobile-nav-overlay"
      onClick={onClose}
    >
      <div 
        className="fixed inset-y-0 left-0 w-64 bg-sidebar shadow-xl z-50 transform transition-transform duration-300 custom-scrollbar overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
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

        {/* Current Project Display */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wide">
              <FolderOpen className="w-3 h-3" />
              <span>Current Project</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-sidebar-accent rounded-lg">
              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                {selectedProject ? (
                  <>
                    <div className="font-medium text-sidebar-foreground">{selectedProject.name}</div>
                    <div className="text-xs text-sidebar-foreground/70">{selectedProject.status}</div>
                  </>
                ) : (
                  <>
                    <div className="font-medium text-sidebar-foreground">
                      {isLoadingProjects ? 'Loading...' : 'No Project Selected'}
                    </div>
                    <div className="text-xs text-sidebar-foreground/70">Use search to select project</div>
                  </>
                )}
              </div>
            </div>
          </div>
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
