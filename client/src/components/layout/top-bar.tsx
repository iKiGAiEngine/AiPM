import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Bell, Menu, Search, Command } from 'lucide-react';
import Sidebar from './Sidebar';

export default function TopBar() {
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleGlobalSearch = () => {
    setSearchOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      handleGlobalSearch();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                data-testid="mobile-menu-button"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar />
            </SheetContent>
          </Sheet>

          {/* Page Title */}
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Metro Plaza Office Tower</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Global Search */}
          <div className="relative hidden sm:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <Input
              type="text"
              placeholder="Search projects, POs, vendors..."
              className="w-80 pl-10 pr-12 py-2 bg-slate-50 border-slate-300"
              onFocus={handleGlobalSearch}
              onKeyDown={handleKeyDown}
              data-testid="global-search-input"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <kbd className="inline-flex items-center px-2 py-1 border border-slate-300 rounded text-xs font-sans font-medium text-slate-500 bg-white">
                <Command className="w-3 h-3 mr-1" />K
              </kbd>
            </div>
          </div>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative"
            data-testid="notifications-button"
          >
            <Bell className="w-5 h-5" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500 border-white">
              3
            </Badge>
          </Button>

          {/* User Menu */}
          <Button
            variant="ghost"
            className="flex items-center space-x-3 p-2"
            data-testid="user-menu-button"
          >
            <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-slate-700">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-slate-700">
              {user?.firstName} {user?.lastName}
            </span>
          </Button>
        </div>
      </div>

      {/* Global search modal trigger */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSearchOpen(false)}>
          {/* Search modal content would go here */}
        </div>
      )}
    </header>
  );
}
