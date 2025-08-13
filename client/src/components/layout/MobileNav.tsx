import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X } from "lucide-react";
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
    name: "Vendors",
    href: "/vendors",
    icon: Building,
    roles: ["Admin", "PM", "Purchaser"]
  },
  {
    name: "Projects",
    href: "/projects",
    icon: FolderOpen,
    roles: ["Admin", "PM"]
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["Admin", "PM", "Purchaser", "AP"]
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

  const canAccess = (roles: string[]) => {
    return user && roles.includes(user.role);
  };

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const handleNavigation = (href: string) => {
    console.log('Mobile navigation clicked:', href);
    console.log('Current location:', location.pathname);
    
    // Don't navigate if already on the target page
    if (location.pathname === href) {
      console.log('Already on target page, skipping navigation');
      onClose();
      return;
    }
    
    try {
      navigate(href);
      console.log('Mobile navigate called successfully');
      onClose();
    } catch (error) {
      console.error('Mobile navigation error:', error);
      onClose();
    }
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
