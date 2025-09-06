import { useState, useMemo, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import type { Project, ProjectMaterial } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, MapPin, Camera, Plus, Trash2, Package, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { formatNumber, parseFormattedNumber } from "@/lib/number-utils";

const requisitionSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  targetDeliveryDate: z.string().optional(),
  deliveryLocation: z.string().optional(),
  specialInstructions: z.string().optional(),
  lines: z.array(z.object({
    materialId: z.string().optional(),
    description: z.string().min(1, "Description is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unit: z.string().min(1, "Unit is required"),
    estimatedCost: z.number().optional(),
    notes: z.string().optional(),
    model: z.string().optional(), // Add model field to schema
  })).min(1, "At least one line item is required"),
});

type RequisitionFormData = z.infer<typeof requisitionSchema>;

// Use real projects from API

const mockUnits = [
  'Each',
  'Box',
  'Case',
  'Linear Feet',
  'Square Feet',
  'Cubic Feet',
];

interface RequisitionFormProps {
  isEdit?: boolean;
  requisitionId?: string;
}

export default function RequisitionForm({ isEdit = false, requisitionId }: RequisitionFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedProject: contextProject } = useProject();
  const [attachments, setAttachments] = useState<File[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [materialSearch, setMaterialSearch] = useState("");
  const [selectedScopeType, setSelectedScopeType] = useState<string>("all");
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});
  const [availableQuantities, setAvailableQuantities] = useState<Record<string, number>>({});
  const [showPhotoSection, setShowPhotoSection] = useState(false);

  // Fetch existing requisition data if in edit mode
  const { data: existingRequisition, isLoading: requisitionLoading } = useQuery({
    queryKey: ['/api/requisitions', requisitionId],
    queryFn: async () => {
      if (!isEdit || !requisitionId) return null;
      console.log('Fetching existing requisition:', requisitionId);
      const response = await fetch(`/api/requisitions/${requisitionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch requisition');
      const data = await response.json();
      console.log('Existing requisition data:', data);
      return data;
    },
    enabled: isEdit && !!requisitionId,
  });

  // Fetch existing requisition lines if in edit mode
  const { data: existingLines = [], isLoading: linesLoading } = useQuery({
    queryKey: ['/api/requisitions', requisitionId, 'lines'],
    queryFn: async () => {
      if (!isEdit || !requisitionId) return [];
      console.log('Fetching existing lines for requisition:', requisitionId);
      const response = await fetch(`/api/requisitions/${requisitionId}/lines`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) return [];
      const data = await response.json();
      console.log('Existing lines data:', data);
      return data;
    },
    enabled: isEdit && !!requisitionId,
  });

  // Fetch real projects from API
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
  });

  // Fetch available materials for selected project (excluding already used ones)
  const { 
    data: materialsResponse, 
    isLoading: materialsLoading, 
    error: materialsError,
    refetch: refetchMaterials 
  } = useQuery({
    queryKey: ['/api/projects', selectedProject, 'materials', 'available'],
    queryFn: async () => {
      if (!selectedProject) return { items: [], total: 0 };
      
      const response = await fetch(`/api/projects/${selectedProject}/materials?available=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to load materials`);
      }
      
      return response.json();
    },
    enabled: !!selectedProject,
    retry: 2,
    retryDelay: 1000,
  });

  // Extract materials from the response
  const projectMaterials = materialsResponse?.items || [];

  // Get unique scope types for filtering
  const scopeTypes = useMemo(() => {
    const types = Array.from(new Set(projectMaterials
      .map((m: any) => m.category)
      .filter(Boolean)
    )).sort();
    return types;
  }, [projectMaterials]);

  // Initialize available quantities when project materials change
  useEffect(() => {
    const quantities: Record<string, number> = {};
    projectMaterials.forEach((material: any) => {
      // Use the available quantity returned from the server (after deducting used quantities)
      quantities[material.id] = parseFloat(material.availableQuantity || material.qty || '0');
    });
    setAvailableQuantities(quantities);
  }, [projectMaterials]);

  // Filter materials based on search and scope type
  const filteredMaterials = useMemo(() => {
    // Server already filters out materials with 0 available quantity
    let filtered = projectMaterials;
    
    if (materialSearch) {
      const searchLower = materialSearch.toLowerCase();
      filtered = filtered.filter((material: any) => 
        material.description?.toLowerCase().includes(searchLower) ||
        material.model?.toLowerCase().includes(searchLower) ||
        material.category?.toLowerCase().includes(searchLower)
      );
    }
    
    if (selectedScopeType !== "all") {
      filtered = filtered.filter((material: any) => material.category === selectedScopeType);
    }
    
    return filtered;
  }, [projectMaterials, materialSearch, selectedScopeType, availableQuantities]);

  // Set up form with default values or existing data
  const form = useForm<RequisitionFormData>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      projectId: contextProject?.id || "",
      title: "",
      targetDeliveryDate: "",
      deliveryLocation: "",
      specialInstructions: "",
      lines: []
    }
  });

  // Auto-select context project when available (for new requisitions)
  useEffect(() => {
    if (!isEdit && contextProject && !form.getValues("projectId")) {
      form.setValue("projectId", contextProject.id);
      setSelectedProject(contextProject.id);
    }
  }, [contextProject, isEdit, form]);

  // Update form values when existing requisition data is loaded
  useEffect(() => {
    console.log('Form update effect triggered:', { 
      isEdit, 
      hasRequisition: !!existingRequisition, 
      hasLines: !!existingLines,
      linesLength: existingLines?.length 
    });
    
    if (isEdit && existingRequisition && existingLines !== undefined) {
      console.log('Updating form with existing data');
      
      const formattedLines = existingLines.map((line: any) => ({
        materialId: line.materialId || "",
        description: line.description || "",
        quantity: parseFloat(line.quantity) || 0,
        unit: line.unit || "",
        estimatedCost: parseFloat(line.estimatedCost) || 0,
        notes: line.notes || "",
        model: line.model || ""
      }));
      
      console.log('Formatted lines for form:', formattedLines);
      
      const formData = {
        projectId: existingRequisition.projectId || "",
        title: existingRequisition.title || "",
        targetDeliveryDate: existingRequisition.targetDeliveryDate ? 
          new Date(existingRequisition.targetDeliveryDate).toISOString().split('T')[0] : "",
        deliveryLocation: existingRequisition.deliveryLocation || "",
        specialInstructions: existingRequisition.specialInstructions || "",
        lines: formattedLines
      };
      
      console.log('Form data to reset:', formData);
      form.reset(formData);
      
      // Set the selected project for materials loading
      setSelectedProject(existingRequisition.projectId || "");
      console.log('Set selected project to:', existingRequisition.projectId);
    }
  }, [existingRequisition, existingLines, form, isEdit]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines'
  });
  
  // Show loading state while fetching existing data in edit mode
  if (isEdit && (requisitionLoading || linesLoading)) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Loading existing requisition...</span>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: RequisitionFormData) => {
    try {
      // Separate lines from main requisition data
      const { lines, ...requisitionData } = data;
      
      // Clean and prepare the data for submission - server will handle organizationId/requesterId from JWT token
      const processedData = {
        ...requisitionData,
        // Clean empty strings and convert to null for optional fields
        targetDeliveryDate: requisitionData.targetDeliveryDate?.trim() || null,
        deliveryLocation: requisitionData.deliveryLocation?.trim() || null,
        specialInstructions: requisitionData.specialInstructions?.trim() || null,
        // Optional fields that server expects
        contractEstimateId: null,
        zone: null,
        attachments: [],
        geoLocation: null,
        rfqId: null,
      };
      
      // Clean up the lines data
      const processedLines = lines.map(line => ({
        ...line,
        // Fix materialId - convert empty string to null for validation
        materialId: line.materialId?.trim() || null,
        // Ensure quantities are integers and descriptions are trimmed
        quantity: Math.floor(line.quantity),
        description: line.description.trim(),
        notes: line.notes?.trim() || null,
        model: line.model?.trim() || null,
        // Ensure estimatedCost is a number
        estimatedCost: typeof line.estimatedCost === 'number' ? line.estimatedCost : 0
      }));

      console.log('Submitting requisition data:', processedData);
      console.log('Lines data:', lines);
      
      const url = isEdit ? `/api/requisitions/${requisitionId}` : '/api/requisitions';
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          ...processedData,
          lines: processedLines
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Submission error:', errorData);
        
        // Handle validation errors with user-friendly messages
        if (errorData.validationErrors && errorData.validationErrors.length > 0) {
          console.error('Validation errors details:', errorData.validationErrors);
          
          // Show specific field errors to user
          const errorMessages = errorData.validationErrors.map((err: any) => err.message).join('\n');
          throw new Error(`Please fix the following errors:\n${errorMessages}`);
        }
        
        throw new Error(errorData.message || errorData.details || errorData.error || 'Failed to create requisition');
      }
      
      toast({
        title: "Success",
        description: isEdit ? "Requisition updated successfully" : "Requisition created successfully",
      });
      
      // Navigate back to requisitions list or the requisition view
      if (isEdit) {
        navigate(`/requisitions/${requisitionId}`);
      } else {
        navigate('/requisitions');
      }
    } catch (error) {
      console.error('Error submitting requisition:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit requisition",
        variant: "destructive",
      });
    }
  };

  const addLineItem = () => {
    append({
      description: '',
      quantity: 1,
      unit: 'Each',
      estimatedCost: 0,
      notes: '',
      model: ''
    });
  };

  const removeLineItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Material selection helpers
  const toggleMaterialSelection = (materialId: string) => {
    setSelectedMaterials(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(materialId)) {
        newSelection.delete(materialId);
        // Remove quantity when deselected
        setMaterialQuantities(prevQty => {
          const newQty = { ...prevQty };
          delete newQty[materialId];
          return newQty;
        });
      } else {
        newSelection.add(materialId);
        // Set full available quantity when selected
        const availableQty = availableQuantities[materialId] || 0;
        setMaterialQuantities(prevQty => ({
          ...prevQty,
          [materialId]: availableQty > 0 ? availableQty : 1
        }));
      }
      return newSelection;
    });
  };

  const selectAllMaterials = () => {
    const allMaterialIds = new Set<string>(filteredMaterials.map((m: any) => m.id));
    setSelectedMaterials(allMaterialIds);
    const quantities: Record<string, number> = {};
    filteredMaterials.forEach((material: any) => {
      const availableQty = availableQuantities[material.id] || 0;
      quantities[material.id] = availableQty > 0 ? availableQty : 1;
    });
    setMaterialQuantities(quantities);
  };

  const deselectAllMaterials = () => {
    setSelectedMaterials(new Set<string>());
    setMaterialQuantities({});
  };

  const updateMaterialQuantity = (materialId: string, quantity: number) => {
    const maxAvailable = availableQuantities[materialId] || 0;
    const clampedQuantity = Math.max(1, Math.min(Math.floor(quantity), Math.floor(maxAvailable)));
    setMaterialQuantities(prev => ({
      ...prev,
      [materialId]: clampedQuantity
    }));
  };

  const addMaterialToRequisition = (material: any, quantity: number) => {
    const newLine = {
      materialId: material.id,
      description: material.description || '',
      model: material.model || '',
      quantity: quantity,
      unit: material.unit || 'Each',
      estimatedCost: (parseFloat(material.unitPrice || '0') || 0) * quantity,
      notes: ''
    };
    append(newLine);

    // Update available quantities
    setAvailableQuantities(prev => ({
      ...prev,
      [material.id]: Math.max(0, (prev[material.id] || 0) - quantity)
    }));

    // Clear selection for this material
    setSelectedMaterials(prev => {
      const newSet = new Set(prev);
      newSet.delete(material.id);
      return newSet;
    });
    setMaterialQuantities(prev => {
      const newQty = { ...prev };
      delete newQty[material.id];
      return newQty;
    });
  };

  const addSelectedMaterials = () => {
    const selectedMaterialsData = filteredMaterials.filter((m: any) => selectedMaterials.has(m.id));
    
    selectedMaterialsData.forEach((material: any) => {
      const quantity = materialQuantities[material.id] || 1;
      addMaterialToRequisition(material, quantity);
    });

    toast({
      title: "Materials Added",
      description: `${selectedMaterialsData.length} materials added to requisition`,
    });

    // Clear all selections
    deselectAllMaterials();
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-20 min-h-screen">
      <Card className="border-0 sm:border shadow-none sm:shadow-sm">
        <CardHeader className="px-2 sm:px-6 pb-4 sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10">
          <div>
            <CardTitle className="text-lg">Create New Requisition</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Request materials for field delivery
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="px-2 sm:px-6 pb-8 form-container">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Project and Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectId">Project *</Label>
              <Select 
                value={form.watch('projectId') || ''} 
                onValueChange={(value) => {
                  form.setValue('projectId', value);
                  setSelectedProject(value);
                }}>
                <SelectTrigger data-testid="select-project" className="h-12 text-base">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Requisition Title *</Label>
              <Input
                {...form.register('title')}
                placeholder="e.g., Restroom fixtures for Zone B-3"
                data-testid="input-title"
                className="h-12 text-base"
                onFocus={(e) => {
                  // Scroll the input into view when focused on mobile
                  setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 300);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDeliveryDate">Target Delivery Date</Label>
            <Input
              {...form.register('targetDeliveryDate')}
              type="date"
              data-testid="input-delivery-date"
              className="max-w-xs"
            />
          </div>

          {/* Available Materials */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Available Project Materials ({filteredMaterials.length})</Label>
              {selectedProject && projectMaterials.length > 0 && (
                <div className="flex items-center gap-2">
                  {selectedMaterials.size > 0 && (
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={addSelectedMaterials}
                      className="text-sm"
                      data-testid="button-add-selected"
                    >
                      <Package className="w-4 h-4 mr-1" />
                      Add Selected ({selectedMaterials.size})
                    </Button>
                  )}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={selectedMaterials.size > 0 ? deselectAllMaterials : selectAllMaterials}
                    className="text-sm"
                    data-testid="button-toggle-all"
                  >
                    {selectedMaterials.size > 0 ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              )}
            </div>

            {selectedProject ? (
              projectMaterials.length > 0 ? (
                <div className="space-y-3">
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search materials..."
                        value={materialSearch}
                        onChange={(e) => setMaterialSearch(e.target.value)}
                        className="pl-10"
                        data-testid="input-material-search"
                      />
                    </div>
                    <div className="min-w-[200px]">
                      <Select value={selectedScopeType} onValueChange={setSelectedScopeType}>
                        <SelectTrigger data-testid="select-scope-type">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Scope Types</SelectItem>
                          {scopeTypes.map((type) => (
                            <SelectItem key={type} value={type || ""}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Materials List */}
                  <div className="border rounded-lg bg-background">
                    <div className="max-h-96 overflow-y-auto">
                      {filteredMaterials.length > 0 ? (
                        <div className="divide-y divide-border">
                          {filteredMaterials.map((material) => (
                            <div 
                              key={material.id} 
                              className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
                              data-testid={`material-row-${material.id}`}
                            >
                              <Checkbox
                                checked={selectedMaterials.has(material.id)}
                                onCheckedChange={() => toggleMaterialSelection(material.id)}
                                data-testid={`checkbox-material-${material.id}`}
                              />
                              
                              <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-3 gap-2">
                                <div className="lg:col-span-2">
                                  <div className="font-medium text-sm truncate">{material.description}</div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {material.model && (
                                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                                        {material.model}
                                      </span>
                                    )}
                                    {material.category && (
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                        {material.category}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between lg:justify-end gap-2">
                                  <div className="text-right">
                                    <div className="text-sm font-semibold text-green-700 dark:text-green-400">
                                      ${parseFloat(material.unitPrice || '0').toFixed(2)} / {material.unit || 'Each'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Available: {Math.floor(availableQuantities[material.id] || 0)}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {selectedMaterials.has(material.id) && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground">Qty:</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    max={Math.floor(availableQuantities[material.id] || 0)}
                                    value={Math.floor(materialQuantities[material.id] || 1)}
                                    onChange={(e) => updateMaterialQuantity(material.id, parseInt(e.target.value) || 1)}
                                    className="w-20 h-8 text-sm"
                                    data-testid={`input-qty-${material.id}`}
                                  />
                                </div>
                              )}

                              <Button 
                                type="button" 
                                size="sm" 
                                variant="outline"
                                className="shrink-0 h-8 px-3 text-xs"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const quantity = materialQuantities[material.id] || 1;
                                  addMaterialToRequisition(material, quantity);
                                  toast({
                                    title: "Material Added",
                                    description: `${material.description} added to requisition`,
                                  });
                                }}
                                data-testid={`button-add-${material.id}`}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground p-6 text-center">
                          No materials match your search criteria
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-6 border border-dashed rounded-lg text-center">
                  <div className="mb-2">No materials found for this project</div>
                  <div className="text-xs">Upload materials first in Project Details</div>
                </div>
              )
            ) : (
              <div className="text-sm text-muted-foreground p-6 border border-dashed rounded-lg text-center">
                {materialsLoading ? (
                  <div className="space-y-2">
                    <div>Loading materials...</div>
                    <div className="animate-pulse bg-muted h-4 w-3/4 mx-auto rounded"></div>
                  </div>
                ) : materialsError ? (
                  <div className="space-y-2">
                    <div className="text-destructive">Failed to load materials</div>
                    <div className="text-xs">{materialsError.message}</div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetchMaterials()}
                      className="mt-2"
                    >
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div>Select a project to see available materials</div>
                )}
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">Material Line Items ({fields.length})</h4>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem} data-testid="button-add-line">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            {fields.length > 0 ? (
              <div className="border rounded-lg bg-background">
                {/* Header Row for Desktop */}
                <div className="hidden lg:grid lg:grid-cols-12 gap-3 p-3 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
                  <div className="col-span-3">Description</div>
                  <div className="col-span-1">Model #</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-1 text-center">Unit</div>
                  <div className="col-span-2 text-center">Est. Cost</div>
                  <div className="col-span-3">Notes</div>
                  <div className="col-span-1 text-center">Actions</div>
                </div>
                
                <div className="divide-y divide-border">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-3" data-testid={`line-item-${index}`}>
                      {/* Mobile Layout - Condensed */}
                      <div className="lg:hidden space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Item #{index + 1}</span>
                          {fields.length > 1 && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeLineItem(index)}
                              className="text-destructive hover:text-destructive h-6 w-6 p-0"
                              data-testid={`button-remove-line-${index}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        
                        {/* Condensed single row */}
                        <div className="space-y-1.5">
                          <Input
                            {...form.register(`lines.${index}.description`)}
                            placeholder="Item description"
                            className="text-sm h-9"
                            data-testid={`input-line-description-${index}`}
                          />
                          
                          <div className="grid grid-cols-3 gap-1.5">
                            <Input
                              value={formatNumber(form.watch(`lines.${index}.quantity`) || 0)}
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(/,/g, '');
                                const numValue = parseFloat(rawValue) || 0;
                                form.setValue(`lines.${index}.quantity`, numValue);
                              }}
                              inputMode="decimal"
                              placeholder="Qty"
                              className="text-sm h-8 text-center"
                              data-testid={`input-line-quantity-${index}`}
                            />
                            <Select 
                              value={form.watch(`lines.${index}.unit`) || ''} 
                              onValueChange={(value) => form.setValue(`lines.${index}.unit`, value)}>
                              <SelectTrigger className="h-8 text-sm" data-testid={`select-line-unit-${index}`}>
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {mockUnits.map((unit) => (
                                  <SelectItem key={unit} value={unit}>
                                    {unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={formatNumber(form.watch(`lines.${index}.estimatedCost`) || 0, 2)}
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(/,/g, '');
                                const numValue = parseFloat(rawValue) || 0;
                                form.setValue(`lines.${index}.estimatedCost`, numValue);
                              }}
                              inputMode="decimal"
                              placeholder="$"
                              className="text-sm h-8"
                              data-testid={`input-line-cost-${index}`}
                            />
                          </div>
                          
                          {/* Model and Notes in compact layout */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <Input
                              {...form.register(`lines.${index}.model`)}
                              placeholder="Model #"
                              className="text-sm h-8"
                              data-testid={`input-line-model-${index}`}
                            />
                            <Input
                              {...form.register(`lines.${index}.notes`)}
                              placeholder="Notes"
                              className="text-sm h-8"
                              data-testid={`input-line-notes-${index}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout - Single Row */}
                      <div className="hidden lg:grid lg:grid-cols-12 gap-3 items-center">
                        <div className="col-span-3">
                          <Input
                            {...form.register(`lines.${index}.description`)}
                            placeholder="Item description"
                            className="border-0 bg-transparent p-0 focus:ring-0 focus:border-0"
                            data-testid={`input-line-description-${index}`}
                          />
                        </div>
                        
                        <div className="col-span-1">
                          <Input
                            {...form.register(`lines.${index}.model`)}
                            placeholder="Model #"
                            className="border-0 bg-transparent p-0 focus:ring-0 focus:border-0"
                            data-testid={`input-line-model-${index}`}
                          />
                        </div>
                        
                        <div className="col-span-1">
                          <Input
                            value={formatNumber(form.watch(`lines.${index}.quantity`) || 0)}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/,/g, '');
                              const numValue = parseFloat(rawValue) || 0;
                              form.setValue(`lines.${index}.quantity`, numValue);
                            }}
                            inputMode="decimal"
                            className="text-center border-0 bg-transparent p-0 focus:ring-0 focus:border-0"
                            data-testid={`input-line-quantity-${index}`}
                          />
                        </div>
                        
                        <div className="col-span-1">
                          <Select 
                            value={form.watch(`lines.${index}.unit`) || ''} 
                            onValueChange={(value) => form.setValue(`lines.${index}.unit`, value)}>
                            <SelectTrigger className="border-0 bg-transparent p-0 focus:ring-0 focus:border-0" data-testid={`select-line-unit-${index}`}>
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockUnits.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="col-span-2">
                          <Input
                            value={formatNumber(form.watch(`lines.${index}.estimatedCost`) || 0, 2)}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/,/g, '');
                              const numValue = parseFloat(rawValue) || 0;
                              form.setValue(`lines.${index}.estimatedCost`, numValue);
                            }}
                            inputMode="decimal"
                            placeholder="0.00"
                            className="border-0 bg-transparent p-0 focus:ring-0 focus:border-0"
                            data-testid={`input-line-cost-${index}`}
                          />
                        </div>
                        
                        <div className="col-span-3">
                          <Input
                            {...form.register(`lines.${index}.notes`)}
                            placeholder="Special instructions or notes"
                            className="border-0 bg-transparent p-0 focus:ring-0 focus:border-0"
                            data-testid={`input-line-notes-${index}`}
                          />
                        </div>
                        
                        <div className="col-span-1 text-center">
                          {fields.length > 1 && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeLineItem(index)}
                              className="text-destructive hover:text-destructive h-8 w-8 p-0"
                              data-testid={`button-remove-line-${index}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground p-6 border border-dashed rounded-lg text-center">
                No line items added yet. Add materials from the Available Project Materials section above.
              </div>
            )}
          </div>

          {/* Photo Attachments */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="photo-attachments" 
                checked={showPhotoSection}
                onCheckedChange={(checked) => setShowPhotoSection(checked === true)}
                data-testid="checkbox-photo-attachments"
              />
              <Label htmlFor="photo-attachments" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Add Photo Attachments
              </Label>
            </div>
            
            {showPhotoSection && (
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-muted-foreground transition-colors">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <div>
                  <Button type="button" variant="ghost" className="font-medium" asChild>
                  <label htmlFor="photo-upload" className="cursor-pointer" data-testid="button-photo-upload">
                    Take Photo or Upload Files
                    <input
                      id="photo-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      className="sr-only"
                      onChange={handleFileUpload}
                    />
                  </label>
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB each</p>
                </div>
              </div>
            )}
            
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                {attachments.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center p-2">
                      <span className="text-xs text-center break-all">{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeAttachment(index)}
                      data-testid={`button-remove-attachment-${index}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="deliveryLocation">Delivery Location</Label>
              <div className="relative">
                <Input
                  {...form.register('deliveryLocation')}
                  placeholder="Drop pin or enter address..."
                  className="pr-10"
                  data-testid="input-delivery-location"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute inset-y-0 right-0 px-3"
                  data-testid="button-get-location"
                >
                  <MapPin className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                {...form.register('specialInstructions')}
                placeholder="Installation notes, special requirements..."
                rows={3}
                className="resize-none"
                data-testid="input-special-instructions"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex flex-col space-y-4 pt-6 border-t border-border">
            <div className="text-sm text-muted-foreground text-center">
              Requisition will be ready for direct PO creation or competitive bidding
            </div>
            <div className="flex justify-center">
              <Button type="submit" className="w-full sm:w-auto h-12 px-8" data-testid="button-submit-requisition">
                Create Requisition
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
    </div>
  );
}
