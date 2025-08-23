import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Package, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Upload, 
  FileSpreadsheet,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectMaterial {
  id: string;
  description: string;
  model?: string;
  unit: string;
  qty: number;
  unitPrice?: number;
  costCode?: string;
  category?: string;
  manufacturer?: string;
  sku?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Project {
  id: string;
  name: string;
  costCodes?: string[];
}

export default function ProjectMaterials() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingMaterial, setEditingMaterial] = useState<ProjectMaterial | null>(null);

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
    enabled: !!projectId,
  });

  // Fetch project materials
  const { data: materials = [], isLoading, error } = useQuery<ProjectMaterial[]>({
    queryKey: [`/api/projects/${projectId}/materials`, searchQuery, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      
      const response = await fetch(`/api/projects/${projectId}/materials?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch project materials');
      return response.json();
    },
    enabled: !!projectId,
  });

  // Update material mutation
  const updateMaterialMutation = useMutation({
    mutationFn: async ({ materialId, updates }: { materialId: string; updates: Partial<ProjectMaterial> }) => {
      const response = await fetch(`/api/project-materials/${materialId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/materials`] });
      setEditingMaterial(null);
      toast({
        title: "Success",
        description: "Material updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update material: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete material mutation
  const deleteMaterialMutation = useMutation({
    mutationFn: async (materialId: string) => {
      const response = await fetch(`/api/project-materials/${materialId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/materials`] });
      toast({
        title: "Success",
        description: "Material deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete material: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return "-";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const filteredMaterials = materials.filter((material) => {
    const matchesCategory = categoryFilter === "all" || material.category === categoryFilter;
    const matchesSearch = !searchQuery || 
      material.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = Array.from(new Set(materials.map(m => m.category).filter(Boolean)));

  if (projectLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

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
              <p className="text-destructive">Failed to load project materials</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/projects/${projectId}`)}
          data-testid="button-back-to-project"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Project
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {project?.name || 'Project'} - Materials
          </h1>
          <p className="text-muted-foreground">Manage materials uploaded for this project</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={`/projects/${projectId}/materials/upload`}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Materials
            </Link>
          </Button>
          <Button asChild>
            <Link to={`/requisitions/new?projectId=${projectId}`}>
              <Plus className="w-4 h-4 mr-2" />
              New Requisition
            </Link>
          </Button>
        </div>
      </div>

      {materials.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Materials Uploaded</h3>
            <p className="text-muted-foreground mb-6">
              This project doesn't have any materials uploaded yet. You can upload an Excel file with your materials or add them manually.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link to={`/projects/${projectId}/materials/upload`}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Materials from Excel
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/requisitions/new?projectId=${projectId}`}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Create New Requisition
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Project Materials ({filteredMaterials.length})
              </CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search materials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search-materials"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Category" />
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
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Cost Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material) => {
                  const total = (material.qty || 0) * (material.unitPrice || 0);
                  return (
                    <TableRow key={material.id} data-testid={`material-row-${material.id}`}>
                      <TableCell className="font-medium">{material.description}</TableCell>
                      <TableCell>{material.model || "-"}</TableCell>
                      <TableCell>{material.unit}</TableCell>
                      <TableCell>{material.qty}</TableCell>
                      <TableCell>
                        {material.unitPrice ? formatCurrency(material.unitPrice) : "-"}
                      </TableCell>
                      <TableCell>{total > 0 ? formatCurrency(total) : "-"}</TableCell>
                      <TableCell>
                        {material.costCode && (
                          <Badge variant="secondary">{material.costCode}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{material.category || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMaterial(material)}
                            data-testid={`button-edit-${material.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this material?')) {
                                deleteMaterialMutation.mutate(material.id);
                              }
                            }}
                            data-testid={`button-delete-${material.id}`}
                            disabled={deleteMaterialMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Material Dialog */}
      <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
        <DialogContent data-testid="dialog-edit-material">
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
            <DialogDescription>
              Update the material details below.
            </DialogDescription>
          </DialogHeader>
          {editingMaterial && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-description">Description *</Label>
                <Input
                  id="edit-description"
                  defaultValue={editingMaterial.description}
                  data-testid="input-edit-description"
                />
              </div>
              <div>
                <Label htmlFor="edit-model">Model</Label>
                <Input
                  id="edit-model"
                  defaultValue={editingMaterial.model || ""}
                  data-testid="input-edit-model"
                />
              </div>
              <div>
                <Label htmlFor="edit-unit">Unit *</Label>
                <Input
                  id="edit-unit"
                  defaultValue={editingMaterial.unit}
                  data-testid="input-edit-unit"
                />
              </div>
              <div>
                <Label htmlFor="edit-qty">Quantity *</Label>
                <Input
                  id="edit-qty"
                  type="number"
                  defaultValue={editingMaterial.qty}
                  data-testid="input-edit-qty"
                />
              </div>
              <div>
                <Label htmlFor="edit-unitPrice">Unit Price</Label>
                <Input
                  id="edit-unitPrice"
                  type="number"
                  step="0.01"
                  defaultValue={editingMaterial.unitPrice || ""}
                  data-testid="input-edit-unit-price"
                />
              </div>
              <div>
                <Label htmlFor="edit-costCode">Cost Code</Label>
                <Select defaultValue={editingMaterial.costCode || ""}>
                  <SelectTrigger data-testid="select-edit-cost-code">
                    <SelectValue placeholder="Select cost code" />
                  </SelectTrigger>
                  <SelectContent>
                    {(project?.costCodes || []).map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMaterial(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (editingMaterial) {
                  const updates = {
                    description: (document.getElementById('edit-description') as HTMLInputElement)?.value,
                    model: (document.getElementById('edit-model') as HTMLInputElement)?.value,
                    unit: (document.getElementById('edit-unit') as HTMLInputElement)?.value,
                    qty: Number((document.getElementById('edit-qty') as HTMLInputElement)?.value),
                    unitPrice: Number((document.getElementById('edit-unitPrice') as HTMLInputElement)?.value) || undefined,
                    costCode: (document.querySelector('[data-testid="select-edit-cost-code"] [data-state="checked"]') as HTMLElement)?.getAttribute('data-value') || undefined,
                  };
                  updateMaterialMutation.mutate({ materialId: editingMaterial.id, updates });
                }
              }}
              disabled={updateMaterialMutation.isPending}
              data-testid="button-save-changes"
            >
              {updateMaterialMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}