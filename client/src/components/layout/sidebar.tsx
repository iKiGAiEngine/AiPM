import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  FileText,
  Truck,
  Receipt,
  Package,
  Building2,
  BarChart3,
  Settings,
  Users
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Requisitions', href: '/requisitions', icon: ClipboardList, badge: 3 },
  { name: 'RFQs & Quotes', href: '/quotes', icon: Calendar },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: FileText },
  { name: 'Deliveries', href: '/deliveries', icon: Truck },
  { name: 'Invoices', href: '/invoices', icon: Receipt, badge: 2 },
];

const catalogNavigation = [
  { name: 'Materials Catalog', href: '/materials', icon: Package },
  { name: 'Vendors', href: '/vendors', icon: Users },
  { name: 'Projects', href: '/projects', icon: Building2 },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-slate-200">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Logo and Brand */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="font-semibold text-slate-900">AiPM</span>
          </div>
        </div>

        {/* Project Switcher */}
        <div className="p-4 border-b border-slate-200">
          <Button
            variant="outline"
            className="w-full justify-between p-3 h-auto"
            data-testid="project-switcher"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-slate-900">Metro Plaza Office Tower</div>
                <div className="text-xs text-slate-500">Phase 2 - Interior Build-out</div>
              </div>
            </div>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== '/dashboard' && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start space-x-3 p-3 h-auto text-left",
                    isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            );
          })}

          <Separator className="my-4" />

          {catalogNavigation.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== '/');
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start space-x-3 p-3 h-auto text-left",
                    isActive && "bg-slate-100 text-slate-900"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Button>
              </Link>
            );
          })}

          <Separator className="my-4" />

          <Link href="/settings">
            <Button
              variant={location.startsWith('/settings') ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start space-x-3 p-3 h-auto text-left",
                location.startsWith('/settings') && "bg-slate-100 text-slate-900"
              )}
              data-testid="nav-settings"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Button>
          </Link>
        </nav>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-slate-700">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 truncate">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-slate-500">{user?.role}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            data-testid="logout-button"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
