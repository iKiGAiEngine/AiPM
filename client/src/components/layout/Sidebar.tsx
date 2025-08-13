import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Settings,
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

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
  }
];

const settingsNavigation = [
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["Admin", "PM"]
  }
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState({
    name: "Metro Plaza Office Tower",
    phase: "Phase 2 - Interior Build-out"
  });

  const canAccess = (roles: string[]) => {
    return user && roles.includes(user.role);
  };

  const isActive = (href: string) => {
    return location === href;
  };

  const handleNavigation = (href: string) => {
    console.log('Sidebar navigation clicked:', href);
    console.log('Current location:', location);
    
    // Don't navigate if already on the target page
    if (location === href) {
      return;
    }
    
    setLocation(href);
    console.log('Navigate called successfully');
    
    // Add a timeout to check if navigation actually worked
    setTimeout(() => {
      console.log('Location after navigate:', location);
      if (location !== href) {
        console.log('Navigate failed, forcing window location change');
        window.location.href = href;
      }
    }, 100);
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-sidebar lg:border-r lg:border-sidebar-border">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Logo and Brand */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">BP</span>
            </div>
            <span className="font-semibold text-sidebar-foreground">BuildProcure AI</span>
          </div>
        </div>

        {/* Project Switcher */}
        <div className="p-4 border-b border-sidebar-border">
          <Button 
            variant="ghost" 
            className="w-full justify-between p-3 h-auto bg-sidebar-accent hover:bg-sidebar-accent/80"
            data-testid="button-project-switcher"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-sidebar-foreground">{selectedProject.name}</div>
                <div className="text-xs text-sidebar-foreground/70">{selectedProject.phase}</div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-sidebar-foreground/70" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
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

          <div className="pt-4 border-t border-sidebar-border">
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

          <div className="pt-4 border-t border-sidebar-border">
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
        </nav>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
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
