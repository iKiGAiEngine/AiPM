import { useState, useEffect } from "react";
import { Search, Command } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  type: 'project' | 'vendor' | 'purchase_order' | 'material';
  name: string;
  description?: string;
  number?: string;
  company?: string;
  sku?: string;
  manufacturer?: string;
  totalAmount?: string;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['/api/search', debouncedQuery],
    enabled: debouncedQuery.length > 2,
    queryFn: async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  });

  const recentSearches = [
    { type: 'project', name: 'Metro Plaza Office Tower', description: 'Project' },
    { type: 'purchase_order', name: 'PO-2024-045', description: 'Purchase Order • $814.80' },
    { type: 'vendor', name: 'Bobrick Hardware', description: 'Vendor • 96% on-time delivery' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // Open search (handled by parent)
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayResults = debouncedQuery.length > 2 ? results : recentSearches;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50"
      onClick={onClose}
      data-testid="global-search-overlay"
    >
      <div className="flex items-start justify-center pt-16 px-4">
        <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-border">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder="Search projects, vendors, POs, materials..."
                className="w-full pl-10 pr-4 py-3 text-lg border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                data-testid="input-global-search-modal"
              />
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            <div className="p-4 space-y-3">
              {debouncedQuery.length <= 2 && (
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Recent
                </div>
              )}
              
              {isLoading && debouncedQuery.length > 2 && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              )}
              
              <div className="space-y-1">
                {displayResults.map((result, index) => (
                  <Button
                    key={result.id || index}
                    variant="ghost"
                    className="w-full justify-start p-2 h-auto"
                    onClick={() => {
                      // Navigate to result
                      console.log('Navigate to:', result);
                      onClose();
                    }}
                    data-testid={`button-search-result-${index}`}
                  >
                    <Search className="w-4 h-4 mr-3 text-muted-foreground flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium text-foreground">
                        {result.name || result.number}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.description || 
                         (result.type === 'project' && 'Project') ||
                         (result.type === 'vendor' && `Vendor${result.company ? ` • ${result.company}` : ''}`) ||
                         (result.type === 'purchase_order' && `Purchase Order${result.totalAmount ? ` • $${result.totalAmount}` : ''}`) ||
                         (result.type === 'material' && `Material${result.manufacturer ? ` • ${result.manufacturer}` : ''}`)}
                      </div>
                    </div>
                  </Button>
                ))}
                
                {displayResults.length === 0 && debouncedQuery.length > 2 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    No results found for "{debouncedQuery}"
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-border bg-muted/50 rounded-b-xl">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Press Enter to search</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
