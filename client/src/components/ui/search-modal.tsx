import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, FileText, Users, Package, Clock } from 'lucide-react';
import type { SearchResult } from '@/types';

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => ApiService.search(query),
    enabled: query.length > 2,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'project':
        return Building2;
      case 'po':
        return FileText;
      case 'vendor':
        return Users;
      case 'material':
        return Package;
      default:
        return Search;
    }
  };

  const recentSearches = [
    { id: '1', type: 'project', title: 'Metro Plaza Office Tower', subtitle: 'Project', url: '/projects/1' },
    { id: '2', type: 'po', title: 'PO-2024-045', subtitle: 'Purchase Order • $814.80', url: '/purchase-orders/1' },
    { id: '3', type: 'vendor', title: 'Bobrick Hardware', subtitle: 'Vendor • 96% on-time delivery', url: '/vendors/1' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search projects, vendors, POs, materials..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 text-lg border-0 focus:ring-0 shadow-none"
              autoFocus
              data-testid="search-modal-input"
            />
          </div>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-3">
            {query.length === 0 && (
              <>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                  Recent
                </div>
                <div className="space-y-1">
                  {recentSearches.map((item) => {
                    const Icon = getIcon(item.type);
                    return (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className="w-full justify-start p-3 h-auto text-left"
                        onClick={() => {
                          setIsOpen(false);
                          // Navigate to item.url
                        }}
                        data-testid={`search-result-${item.id}`}
                      >
                        <Icon className="w-4 h-4 mr-3 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900">{item.title}</div>
                          <div className="text-sm text-slate-500">{item.subtitle}</div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </>
            )}

            {query.length > 0 && (
              <>
                {isLoading && (
                  <div className="flex items-center space-x-3 p-3">
                    <div className="w-4 h-4 bg-slate-300 rounded animate-pulse" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-slate-300 rounded animate-pulse" />
                      <div className="h-3 bg-slate-200 rounded animate-pulse w-2/3" />
                    </div>
                  </div>
                )}

                {!isLoading && results.length === 0 && (
                  <div className="text-center py-6 text-slate-500">
                    <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>No results found for "{query}"</p>
                  </div>
                )}

                {results.map((item: SearchResult) => {
                  const Icon = getIcon(item.type);
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className="w-full justify-start p-3 h-auto text-left data-table-row"
                      onClick={() => {
                        setIsOpen(false);
                        // Navigate to item.url
                      }}
                      data-testid={`search-result-${item.id}`}
                    >
                      <Icon className="w-4 h-4 mr-3 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900">{item.title}</div>
                        <div className="text-sm text-slate-500">{item.subtitle}</div>
                      </div>
                      <Badge variant="secondary" className="ml-2 capitalize">
                        {item.type}
                      </Badge>
                    </Button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Press Enter to search</span>
          <span>ESC to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
