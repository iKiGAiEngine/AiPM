import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Package, CheckCircle, AlertCircle } from "lucide-react";
import type { Material } from "@shared/schema";

export default function Materials() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: materials = [], isLoading, error } = useQuery<Material[]>({
    queryKey: ['/api/materials', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      
      const response = await fetch(`/api/materials?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch materials');
      return response.json();
    },
  });

  const filteredMaterials = materials.filter((material) => {
    const matchesCategory = categoryFilter === "all" || material.category === categoryFilter;
    return matchesCategory;
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const categories = Array.from(new Set(materials.map(m => m.category).filter(Boolean)));

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive">Failed to load materials catalog</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Materials Catalog</h1>
          <p className="text-muted-foreground">Browse and manage construction materials and specifications</p>
        </div>
        <Button asChild data-testid="button-new-material">
          <Link to="/materials/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Material
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by SKU, description, or manufacturer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardContent className="p-0">
          {filteredMaterials.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                {searchQuery || categoryFilter !== "all" ? (
                  <p>No materials match your search criteria</p>
                ) : (
                  <p>No materials in catalog yet. Add your first material to get started.</p>
                )}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Last Cost</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material) => (
                  <TableRow key={material.id} className="cursor-pointer hover:bg-muted/50" data-testid={`material-row-${material.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-sm" data-testid={`material-sku-${material.id}`}>
                          {material.sku}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="font-medium truncate" data-testid={`material-description-${material.id}`}>
                          {material.description}
                        </div>
                        {material.model && (
                          <div className="text-sm text-muted-foreground" data-testid={`material-model-${material.id}`}>
                            Model: {material.model}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span data-testid={`material-manufacturer-${material.id}`}>
                        {material.manufacturer || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" data-testid={`material-category-${material.id}`}>
                        {material.category || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" data-testid={`material-unit-${material.id}`}>
                        {material.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium" data-testid={`material-cost-${material.id}`}>
                        {material.lastCost ? formatCurrency(material.lastCost) : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" data-testid={`material-lead-time-${material.id}`}>
                        {material.leadTimeDays ? `${material.leadTimeDays} days` : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {material.substitutable ? (
                          <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Available</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">Special Order</span>
                          </div>
                        )}
                        {material.ofci && (
                          <Badge variant="outline" className="text-xs">
                            OFCI
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild data-testid={`button-view-material-${material.id}`}>
                        <Link to={`/materials/${material.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
