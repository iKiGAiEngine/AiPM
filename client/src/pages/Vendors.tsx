import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, Building, Mail, Phone, MapPin, CheckCircle, XCircle } from "lucide-react";
import type { Vendor } from "@shared/schema";

export default function Vendors() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: vendors = [], isLoading, error } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
    queryFn: async () => {
      const response = await fetch('/api/vendors', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch vendors');
      return response.json();
    },
  });

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

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
              <p className="text-destructive">Failed to load vendors</p>
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
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-muted-foreground">Manage vendor relationships and performance tracking</p>
        </div>
        <Button asChild data-testid="button-new-vendor">
          <Link to="/vendors/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-muted-foreground">
              {searchQuery ? (
                <p>No vendors match your search criteria</p>
              ) : (
                <p>No vendors yet. Add your first vendor to get started.</p>
              )}
            </div>
          </div>
        ) : (
          filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-md transition-shadow" data-testid={`vendor-card-${vendor.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                      <Building className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate" data-testid={`vendor-name-${vendor.id}`}>
                        {vendor.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground truncate" data-testid={`vendor-company-${vendor.id}`}>
                        {vendor.company}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {vendor.isActive ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Contact Information */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground truncate" data-testid={`vendor-email-${vendor.id}`}>
                      {vendor.email}
                    </span>
                  </div>
                  
                  {vendor.phone && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground" data-testid={`vendor-phone-${vendor.id}`}>
                        {vendor.phone}
                      </span>
                    </div>
                  )}
                  
                  {vendor.address && (
                    <div className="flex items-start space-x-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground text-xs leading-relaxed" data-testid={`vendor-address-${vendor.id}`}>
                        {vendor.address}
                      </span>
                    </div>
                  )}
                </div>

                {/* Payment Terms */}
                {vendor.terms && (
                  <div className="pt-2 border-t border-border">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Payment Terms: </span>
                      <span className="font-medium" data-testid={`vendor-terms-${vendor.id}`}>
                        {vendor.terms}
                      </span>
                    </div>
                  </div>
                )}

                {/* Delivery Regions */}
                {vendor.deliveryRegions && vendor.deliveryRegions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">Delivery regions:</span>
                    {vendor.deliveryRegions.slice(0, 3).map((region) => (
                      <Badge key={region} variant="outline" className="text-xs">
                        {region}
                      </Badge>
                    ))}
                    {vendor.deliveryRegions.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{vendor.deliveryRegions.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* EDI Flag */}
                {vendor.ediFlags && (
                  <div className="pt-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs">
                      EDI Enabled
                    </Badge>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Performance metrics available
                    </div>
                    <Button variant="ghost" size="sm" asChild data-testid={`button-view-vendor-${vendor.id}`}>
                      <Link to={`/vendors/${vendor.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
