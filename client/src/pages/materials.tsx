import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Eye, Edit, Package, CheckCircle, XCircle, Upload, Download } from "lucide-react";

export default function Materials() {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const { data: materials, isLoading } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/materials`, searchTerm],
    enabled: !!currentOrganization?.id,
  });

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const getAdaBadge = (adaCompliant: boolean) => {
    return adaCompliant ? (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">ADA</Badge>
    ) : null;
  };

  const getDivisionName = (division: string) => {
    const divisions = {
      "10": "Specialties",
      "11": "Equipment", 
      "12": "Furnishings",
      "13": "Special Construction",
      "14": "Conveying Equipment"
    };
    return divisions[division as keyof typeof divisions] || `Division ${division}`;
  };

  const filteredMaterials = materials?.filter((material: any) => {
    const matchesSearch = material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "active") return matchesSearch && material.isActive;
    if (activeTab === "inactive") return matchesSearch && !material.isActive;
    if (activeTab === "ada") return matchesSearch && material.adaCompliant;
    
    return matchesSearch;
  }) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Materials Catalog</h1>
          <p className="text-slate-600">Manage product database and specifications</p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" data-testid="button-import-materials">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" data-testid="button-export-materials">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-material">
                <Plus className="mr-2 h-4 w-4" />
                Add Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Material</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 p-4">
                <p className="text-muted-foreground">Material creation form would be implemented here with:</p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                  <li>SKU and description fields</li>
                  <li>Manufacturer and model information</li>
                  <li>Unit of measure and category selection</li>
                  <li>Division 10 specialties categorization</li>
                  <li>Finish, mounting, and ADA compliance options</li>
                  <li>Lead time and cost information</li>
                  <li>Image upload and specification links</li>
                  <li>Substitution and minimum order settings</li>
                </ul>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
              <TabsList>
                <TabsTrigger value="all" data-testid="tab-all-materials">All Materials</TabsTrigger>
                <TabsTrigger value="active" data-testid="tab-active-materials">Active</TabsTrigger>
                <TabsTrigger value="inactive" data-testid="tab-inactive-materials">Inactive</TabsTrigger>
                <TabsTrigger value="ada" data-testid="tab-ada-materials">ADA Compliant</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-materials"
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
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Package className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No materials found</h3>
              <p className="text-slate-600 mb-6">
                {searchTerm ? "Try adjusting your search criteria" : "Start building your materials catalog"}
              </p>
              {!searchTerm && (
                <div className="flex justify-center space-x-2">
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Material
                  </Button>
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Last Cost</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material: any) => (
                    <TableRow key={material.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-medium" data-testid={`material-${material.sku}`}>
                        <div className="flex items-center space-x-2">
                          <span>{material.sku}</span>
                          {getAdaBadge(material.adaCompliant)}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`description-${material.id}`}>
                        <div>
                          <div className="font-medium">{material.description}</div>
                          {material.model && (
                            <div className="text-sm text-slate-500">Model: {material.model}</div>
                          )}
                          {material.finish && (
                            <div className="text-sm text-slate-500">Finish: {material.finish}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`manufacturer-${material.id}`}>
                        {material.manufacturer || "N/A"}
                      </TableCell>
                      <TableCell data-testid={`division-${material.id}`}>
                        <div>
                          <div className="font-medium">Div {material.division || "10"}</div>
                          <div className="text-sm text-slate-500">{getDivisionName(material.division || "10")}</div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`unit-${material.id}`}>
                        {material.unit}
                      </TableCell>
                      <TableCell data-testid={`cost-${material.id}`}>
                        {material.lastCost ? `$${parseFloat(material.lastCost).toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell data-testid={`lead-time-${material.id}`}>
                        {material.leadTimeDays ? `${material.leadTimeDays} days` : "TBD"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(material.isActive)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-view-${material.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-edit-${material.id}`}
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

      {/* Category Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">
                {filteredMaterials.filter((m: any) => m.division === "10").length}
              </p>
              <p className="text-sm text-slate-600">Specialties</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {filteredMaterials.filter((m: any) => m.adaCompliant).length}
              </p>
              <p className="text-sm text-slate-600">ADA Compliant</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {filteredMaterials.filter((m: any) => m.isActive).length}
              </p>
              <p className="text-sm text-slate-600">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">
                {filteredMaterials.filter((m: any) => m.substitutable).length}
              </p>
              <p className="text-sm text-slate-600">Substitutable</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {filteredMaterials.filter((m: any) => m.lastCost).length}
              </p>
              <p className="text-sm text-slate-600">With Pricing</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
