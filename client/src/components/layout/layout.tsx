import { useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopAppBar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: ReactNode;
}

const pageConfig = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview and analytics' },
  '/requisitions': { title: 'Requisitions', subtitle: 'Manage material requests from the field' },
  '/rfqs': { title: 'RFQs & Quotes', subtitle: 'Request quotes from vendors and analyze responses' },
  '/purchase-orders': { title: 'Purchase Orders', subtitle: 'Manage purchase orders and vendor communications' },
  '/deliveries': { title: 'Deliveries', subtitle: 'Track receipts and manage delivery confirmations' },
  '/invoices': { title: 'Invoices', subtitle: 'Process vendor invoices and manage payments' },
  '/materials': { title: 'Materials Catalog', subtitle: 'Manage product database and specifications' },
  '/vendors': { title: 'Vendors', subtitle: 'Supplier management and scorecards' },
  '/projects': { title: 'Projects', subtitle: 'Project oversight and budget management' },
  '/reports': { title: 'Reports', subtitle: 'Analytics and insights' },
  '/settings': { title: 'Settings', subtitle: 'Organization and user preferences' },
};

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();

  const currentPageConfig = pageConfig[location.pathname as keyof typeof pageConfig] || {
    title: 'BuildProcure AI',
    subtitle: undefined
  };

  // Close mobile nav when route changes
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  // Close mobile nav when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (isMobileNavOpen && isMobile) {
        const target = event.target as Element;
        const sidebar = document.getElementById('mobile-sidebar');
        const toggle = document.querySelector('[data-testid="mobile-menu-toggle"]');
        
        if (sidebar && !sidebar.contains(target) && !toggle?.contains(target)) {
          setIsMobileNavOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMobileNavOpen, isMobile]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-sidebar lg:border-r lg:border-sidebar-border">
        <Sidebar />
      </aside>

      {/* Mobile Navigation Overlay */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden">
          <div
            id="mobile-sidebar"
            className={cn(
              "fixed inset-y-0 left-0 w-64 bg-sidebar shadow-xl z-50 transform transition-transform duration-300",
              isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col overflow-hidden">
        <TopBar
          onMobileMenuToggle={() => setIsMobileNavOpen(!isMobileNavOpen)}
          pageTitle={currentPageConfig.title}
          pageSubtitle={currentPageConfig.subtitle}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scroll-area">
          {children}
        </main>
      </div>

      {/* Global Keyboard Shortcuts */}
      <div className="hidden">
        <button
          onClick={() => {
            const searchInput = document.querySelector('[data-testid="global-search-input"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
            }
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              const searchInput = document.querySelector('[data-testid="global-search-input"]') as HTMLInputElement;
              if (searchInput) {
                searchInput.focus();
              }
            }
          }}
          data-testid="global-search-shortcut"
        />
      </div>
    </div>
  );
}
