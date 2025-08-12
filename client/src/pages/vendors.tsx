import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Search, Eye, Edit, Building, Mail, Phone, Globe, Star, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function Vendors() {
  const { currentOrganization } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: vendors, isLoading } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/vendors`],
    enabled: !!currentOrganization?.id,
  });

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 95) return "text-green-600";
    if (percentage >= 85) return "text-yellow-600";
    return "text-red-600";
  };

  const getPerformanceRating = (onTimePercent: number) => {
    if (onTimePercent >= 95) return "Excellent";
    if (onTimePercent >= 85) return "Good";
    if (onTimePercent >= 75) return "Fair";
    return "Poor";
  };

  const filteredVendors = vendors?.filter((vendor: any) =>
    vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.deliveryRegions?.some((region: string) => 
      region.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
          <p className="text-slate-600">Supplier management and scorecards</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-vendor">
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-4">
              <p className="text-muted-foreground">Vendor creation form would be implemented here with:</p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                <li>Company name and contact information</li>
                <li>Address and service regions</li>
                <li>Payment terms and tax ID</li>
                <li>EDI capabilities and portal access</li>
                <li>Primary and secondary contacts</li>
                <li>Certifications and insurance details</li>
                <li>Category specializations</li>
                <li>Initial performance baseline setup</li>
              </ul>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>All Vendors</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-vendors"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Building className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No vendors found</h3>
              <p className="text-slate-600 mb-6">
                {searchTerm ? "Try adjusting your search criteria" : "Build your vendor network to streamline procurement"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Vendor
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Regions</TableHead>
                    <TableHead>On-Time %</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor: any) => (
                    <TableRow key={vendor.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell data-testid={`vendor-${vendor.id}`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Building className="h-5 w-5 text-slate-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{vendor.name}</div>
                            {vendor.website && (
                              <div className="text-sm text-slate-500 flex items-center">
                                <Globe className="h-3 w-3 mr-1" />
                                {vendor.website}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`contact-${vendor.id}`}>
                        <div className="space-y-1">
                          {vendor.email && (
                            <div className="text-sm flex items-center">
                              <Mail className="h-3 w-3 mr-2 text-slate-400" />
                              {vendor.email}
                            </div>
                          )}
                          {vendor.phone && (
                            <div className="text-sm flex items-center">
                              <Phone className="h-3 w-3 mr-2 text-slate-400" />
                              {vendor.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`regions-${vendor.id}`}>
                        <div className="flex flex-wrap gap-1">
                          {vendor.deliveryRegions?.slice(0, 2).map((region: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {region}
                            </Badge>
                          ))}
                          {vendor.deliveryRegions?.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{vendor.deliveryRegions.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`on-time-${vendor.id}`}>
                        <div className="flex items-center space-x-2">
                          <span className={`font-medium ${getPerformanceColor(vendor.scorecard?.onTimePercent || 0)}`}>
                            {vendor.scorecard?.onTimePercent?.toFixed(1) || "0"}%
                          </span>
                          <Progress 
                            value={vendor.scorecard?.onTimePercent || 0} 
                            className="w-16 h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell data-testid={`response-time-${vendor.id}`}>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span className="text-sm">
                            {vendor.scorecard?.avgResponseTimeHours?.toFixed(1) || "0"}h
                          </span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`rating-${vendor.id}`}>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium">
                            {getPerformanceRating(vendor.scorecard?.onTimePercent || 0)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(vendor.isActive)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-view-${vendor.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-edit-${vendor.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Top Performers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredVendors
                .filter((v: any) => v.scorecard?.onTimePercent)
                .sort((a: any, b: any) => (b.scorecard?.onTimePercent || 0) - (a.scorecard?.onTimePercent || 0))
                .slice(0, 5)
                .map((vendor: any, index: number) => (
                  <div key={vendor.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{vendor.name}</div>
                        <div className="text-sm text-slate-500">
                          {vendor.scorecard?.totalOrders || 0} orders
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {vendor.scorecard?.onTimePercent?.toFixed(1)}%
                      </div>
                      <div className="text-sm text-slate-500">
                        {vendor.scorecard?.avgResponseTimeHours?.toFixed(1)}h avg
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Vendor Capabilities</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="font-medium">EDI Capable</span>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-blue-600">
                    {filteredVendors.filter((v: any) => v.ediCapable).length}
                  </span>
                  <span className="text-sm text-slate-500">
                    of {filteredVendors.length}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="font-medium">Active Vendors</span>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-green-600">
                    {filteredVendors.filter((v: any) => v.isActive).length}
                  </span>
                  <span className="text-sm text-slate-500">
                    of {filteredVendors.length}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="font-medium">Multi-Region</span>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-purple-600">
                    {filteredVendors.filter((v: any) => v.deliveryRegions?.length > 1).length}
                  </span>
                  <span className="text-sm text-slate-500">
                    of {filteredVendors.length}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="font-medium">Avg Response Time</span>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-amber-600">
                    {(filteredVendors.reduce((acc: number, v: any) => 
                      acc + (v.scorecard?.avgResponseTimeHours || 0), 0) / 
                      filteredVendors.filter((v: any) => v.scorecard?.avgResponseTimeHours).length || 0
                    ).toFixed(1)}h
                  </span>
                  <span className="text-sm text-slate-500">
                    overall
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
