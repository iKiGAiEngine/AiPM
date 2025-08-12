import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Search, FileText, Building, Package, ShoppingCart, Clock } from 'lucide-react';
import type { SearchResult } from '@/types';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [recentSearches] = useState<SearchResult[]>([
    { type: 'project', id: '1', title: 'Metro Plaza Office Tower', subtitle: 'Active Project' },
    { type: 'purchase_order', id: '2', title: 'PO-2024-045', subtitle: 'Purchase Order • $814.80' },
    { type: 'vendor', id: '3', title: 'Bobrick Hardware', subtitle: 'Vendor • 96% on-time delivery' },
  ]);
  const { currentOrganization } = useAuth();
  const [, setLocation] = useLocation();

  const { data: searchResults, isLoading } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/search`, query],
    enabled: !!currentOrganization?.id && query.length > 2,
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'project':
        return Building;
      case 'purchase_order':
        return FileText;
      case 'vendor':
        return Building;
      case 'material':
        return Package;
      default:
        return FileText;
    }
  };

  const getRoute = (result: SearchResult) => {
    switch (result.type) {
      case 'project':
        return `/projects/${result.id}`;
      case 'purchase_order':
        return `/purchase-orders/${result.id}`;
      case 'vendor':
        return `/vendors/${result.id}`;
      case 'material':
        return `/materials/${result.id}`;
      default:
        return '/dashboard';
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setLocation(getRoute(result));
    onClose();
    setQuery('');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // This would be handled by the parent component
        }
      }
      
      if (e.key === 'Escape' && isOpen) {
        onClose();
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <div className="border-b border-border p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, vendors, POs, materials..."
              className="pl-10 pr-4 border-0 focus-visible:ring-0 text-lg h-12"
              autoFocus
              data-testid="global-search-modal-input"
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto scroll-area">
          {query.length === 0 ? (
            <div className="p-4 space-y-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recent Searches
              </div>
              <div className="space-y-1">
                {recentSearches.map((result) => {
                  const Icon = getIcon(result.type);
                  return (
                    <Button
                      key={result.id}
                      variant="ghost"
                      className="w-full justify-start h-auto p-3"
                      onClick={() => handleResultClick(result)}
                      data-testid={`recent-search-${result.id}`}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="text-left flex-1">
                          <div className="font-medium text-foreground">{result.title}</div>
                          <div className="text-sm text-muted-foreground">{result.subtitle}</div>
                        </div>
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : query.length <= 2 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Type at least 3 characters to search</p>
            </div>
          ) : isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3">
                  <Skeleton className="h-4 w-4" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="p-4 space-y-1">
              {searchResults.map((result: SearchResult) => {
                const Icon = getIcon(result.type);
                return (
                  <Button
                    key={`${result.type}-${result.id}`}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3"
                    onClick={() => handleResultClick(result)}
                    data-testid={`search-result-${result.type}-${result.id}`}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="text-left flex-1">
                        <div className="font-medium text-foreground">{result.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.subtitle} • {result.type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try adjusting your search terms</p>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3 bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Press Enter to search</span>
            <span>ESC to close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
