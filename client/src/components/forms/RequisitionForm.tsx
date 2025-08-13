import { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
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

const requisitionSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  targetDeliveryDate: z.string().optional(),
  deliveryLocation: z.string().optional(),
  specialInstructions: z.string().optional(),
  lines: z.array(z.object({
    materialId: z.string().optional(),
    description: z.string().min(1, "Description is required"),
    quantity: z.number().min(0.01, "Quantity must be greater than 0"),
    unit: z.string().min(1, "Unit is required"),
    estimatedCost: z.number().optional(),
    notes: z.string().optional(),
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

export default function RequisitionForm() {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<File[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [materialSearch, setMaterialSearch] = useState("");
  const [selectedScopeType, setSelectedScopeType] = useState<string>("all");
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});

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

  // Fetch materials for selected project
  const { data: projectMaterials = [] } = useQuery<ProjectMaterial[]>({
    queryKey: ['/api/projects', selectedProject, 'materials'],
    queryFn: async () => {
      if (!selectedProject) return [];
      const response = await fetch(`/api/projects/${selectedProject}/materials`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedProject,
  });

  // Get unique scope types for filtering
  const scopeTypes = useMemo(() => {
    const types = Array.from(new Set(projectMaterials
      .map(m => m.category)
      .filter(Boolean)
    )).sort();
    return types;
  }, [projectMaterials]);

  // Filter materials based on search and scope type
  const filteredMaterials = useMemo(() => {
    let filtered = projectMaterials;
    
    if (materialSearch) {
      const searchLower = materialSearch.toLowerCase();
      filtered = filtered.filter(material => 
        material.description?.toLowerCase().includes(searchLower) ||
        material.model?.toLowerCase().includes(searchLower) ||
        material.category?.toLowerCase().includes(searchLower)
      );
    }
    
    if (selectedScopeType !== "all") {
      filtered = filtered.filter(material => material.category === selectedScopeType);
    }
    
    return filtered;
  }, [projectMaterials, materialSearch, selectedScopeType]);

  const form = useForm<RequisitionFormData>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      lines: [{
        description: '',
        quantity: 1,
        unit: 'Each',
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines'
  });

  const onSubmit = async (data: RequisitionFormData) => {
    try {
      // Separate lines from main requisition data
      const { lines, ...requisitionData } = data;
      
      // Convert date string to ISO date if provided
      const processedData = {
        ...requisitionData,
        targetDeliveryDate: requisitionData.targetDeliveryDate 
          ? new Date(requisitionData.targetDeliveryDate).toISOString() 
          : undefined,
      };

      console.log('Submitting requisition data:', processedData);
      console.log('Lines data:', lines);
      
      const response = await fetch('/api/requisitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          ...processedData,
          lines: lines
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Submission error:', errorData);
        throw new Error(errorData.error || 'Failed to create requisition');
      }
      
      toast({
        title: "Success",
        description: "Requisition submitted successfully",
      });
      
      // Navigate back to requisitions list
      window.location.href = '/requisitions';
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
      notes: ''
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
        // Set default quantity when selected
        setMaterialQuantities(prevQty => ({
          ...prevQty,
          [materialId]: 1
        }));
      }
      return newSelection;
    });
  };

  const selectAllMaterials = () => {
    const allMaterialIds = new Set(filteredMaterials.map(m => m.id));
    setSelectedMaterials(allMaterialIds);
    const quantities: Record<string, number> = {};
    filteredMaterials.forEach(material => {
      quantities[material.id] = 1;
    });
    setMaterialQuantities(quantities);
  };

  const deselectAllMaterials = () => {
    setSelectedMaterials(new Set());
    setMaterialQuantities({});
  };

  const updateMaterialQuantity = (materialId: string, quantity: number) => {
    setMaterialQuantities(prev => ({
      ...prev,
      [materialId]: Math.max(0.01, quantity)
    }));
  };

  const addSelectedMaterials = () => {
    const selectedMaterialsData = filteredMaterials.filter(m => selectedMaterials.has(m.id));
    
    selectedMaterialsData.forEach(material => {
      const quantity = materialQuantities[material.id] || 1;
      const newLine = {
        materialId: material.id,
        description: material.description || '',
        quantity: quantity,
        unit: material.unit || 'Each',
        estimatedCost: (parseFloat(material.unitPrice || '0') || 0) * quantity,
        notes: ''
      };
      append(newLine);
    });

    toast({
      title: "Materials Added",
      description: `${selectedMaterialsData.length} materials added to requisition`,
    });

    // Clear selections
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
              <Select onValueChange={(value) => {
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
                                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                                    ${parseFloat(material.unitPrice || '0').toFixed(2)} / {material.unit || 'Each'}
                                  </span>
                                </div>
                              </div>

                              {selectedMaterials.has(material.id) && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground">Qty:</Label>
                                  <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={materialQuantities[material.id] || 1}
                                    onChange={(e) => updateMaterialQuantity(material.id, parseFloat(e.target.value))}
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
                                  const newLine = {
                                    materialId: material.id,
                                    description: material.description || '',
                                    quantity: quantity,
                                    unit: material.unit || 'Each',
                                    estimatedCost: (parseFloat(material.unitPrice || '0') || 0) * quantity,
                                    notes: ''
                                  };
                                  append(newLine);
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
                Select a project to see available materials
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
                  <div className="col-span-4">Description</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-1 text-center">Unit</div>
                  <div className="col-span-2 text-center">Est. Cost</div>
                  <div className="col-span-3">Notes</div>
                  <div className="col-span-1 text-center">Actions</div>
                </div>
                
                <div className="divide-y divide-border">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-3" data-testid={`line-item-${index}`}>
                      {/* Mobile Layout */}
                      <div className="lg:hidden space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Item #{index + 1}</span>
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
                        
                        <div className="space-y-2">
                          <Input
                            {...form.register(`lines.${index}.description`)}
                            placeholder="Item description"
                            data-testid={`input-line-description-${index}`}
                          />
                          
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="Quantity"
                              data-testid={`input-line-quantity-${index}`}
                            />
                            <Select onValueChange={(value) => form.setValue(`lines.${index}.unit`, value)}>
                              <SelectTrigger data-testid={`select-line-unit-${index}`}>
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
                          
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              {...form.register(`lines.${index}.estimatedCost`, { valueAsNumber: true })}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Cost ($)"
                              data-testid={`input-line-cost-${index}`}
                            />
                            <Input
                              {...form.register(`lines.${index}.notes`)}
                              placeholder="Notes"
                              data-testid={`input-line-notes-${index}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout - Single Row */}
                      <div className="hidden lg:grid lg:grid-cols-12 gap-3 items-center">
                        <div className="col-span-4">
                          <Input
                            {...form.register(`lines.${index}.description`)}
                            placeholder="Item description"
                            className="border-0 bg-transparent p-0 focus:ring-0 focus:border-0"
                            data-testid={`input-line-description-${index}`}
                          />
                        </div>
                        
                        <div className="col-span-1">
                          <Input
                            {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
                            type="number"
                            min="0.01"
                            step="0.01"
                            className="text-center border-0 bg-transparent p-0 focus:ring-0 focus:border-0"
                            data-testid={`input-line-quantity-${index}`}
                          />
                        </div>
                        
                        <div className="col-span-1">
                          <Select onValueChange={(value) => form.setValue(`lines.${index}.unit`, value)}>
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
                            {...form.register(`lines.${index}.estimatedCost`, { valueAsNumber: true })}
                            type="number"
                            min="0"
                            step="0.01"
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
            <Label>Photo Attachments</Label>
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
              Will be routed to <span className="font-medium">Project Manager</span> for approval
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Button type="button" variant="outline" className="w-full sm:w-auto h-12" data-testid="button-save-draft">
                Save Draft
              </Button>
              <Button type="submit" className="w-full sm:w-auto h-12" data-testid="button-submit-requisition">
                Submit Requisition
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
    </div>
  );
}
