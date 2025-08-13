import { useState } from "react";
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
import { Search, MapPin, Camera, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const requisitionSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  zone: z.string().optional(),
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

const mockZones = [
  'Zone A-1: Main Lobby',
  'Zone B-3: Restrooms',
  'Zone C-2: Office Areas',
];

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
      const response = await fetch('/api/requisitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to create requisition');
      
      toast({
        title: "Success",
        description: "Requisition submitted successfully",
      });
      
      // Navigate back to requisitions list
      window.location.href = '/requisitions';
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit requisition",
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle>Create New Requisition</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Request materials for field delivery
          </p>
        </div>
        <Badge variant="secondary">Mobile Optimized</Badge>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Project and Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="projectId">Project *</Label>
              <Select onValueChange={(value) => {
                form.setValue('projectId', value);
                setSelectedProject(value);
              }}>
                <SelectTrigger data-testid="select-project">
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
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="zone">Project Zone</Label>
              <Select onValueChange={(value) => form.setValue('zone', value)}>
                <SelectTrigger data-testid="select-zone">
                  <SelectValue placeholder="Select zone..." />
                </SelectTrigger>
                <SelectContent>
                  {mockZones.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="targetDeliveryDate">Target Delivery Date</Label>
              <Input
                {...form.register('targetDeliveryDate')}
                type="date"
                data-testid="input-delivery-date"
              />
            </div>
          </div>

          {/* Available Materials */}
          <div className="space-y-4">
            <Label>Available Project Materials ({projectMaterials.length})</Label>
            {selectedProject ? (
              projectMaterials.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto border rounded-lg p-4">
                  {projectMaterials.map((material) => (
                    <div 
                      key={material.id} 
                      className="material-card flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors active:bg-muted touch-manipulation"
                      onClick={() => {
                        const newLine = {
                          materialId: material.id,
                          description: material.description || '',
                          quantity: 1,
                          unit: material.unit || 'Each',
                          estimatedCost: parseFloat(material.unitPrice || '0') || 0,
                          notes: ''
                        };
                        append(newLine);
                        toast({
                          title: "Material Added",
                          description: `${material.description} added to requisition`,
                        });
                      }}
                      data-testid={`material-card-${material.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium mb-1 line-clamp-2">{material.description}</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-green-600">
                            ${parseFloat(material.unitPrice || '0').toFixed(2)} per {material.unit || 'Each'}
                          </span>
                          {material.category && (
                            <Badge variant="secondary" className="text-xs">
                              {material.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-0 sm:ml-4">
                        <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto">
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
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
              <h4 className="font-medium text-foreground">Material Line Items</h4>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem} data-testid="button-add-line">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border border-border rounded-lg space-y-4 bg-card">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-sm">Item #{index + 1}</h5>
                  {fields.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeLineItem(index)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-remove-line-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Input
                      {...form.register(`lines.${index}.description`)}
                      placeholder="Item description"
                      data-testid={`input-line-description-${index}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
                        type="number"
                        min="0.01"
                        step="0.01"
                        data-testid={`input-line-quantity-${index}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit *</Label>
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
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estimated Cost</Label>
                    <Input
                      {...form.register(`lines.${index}.estimatedCost`, { valueAsNumber: true })}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      data-testid={`input-line-cost-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      {...form.register(`lines.${index}.notes`)}
                      placeholder="Special instructions or notes"
                      data-testid={`input-line-notes-${index}`}
                    />
                  </div>
                </div>


              </div>
            ))}
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
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Will be routed to <span className="font-medium">Project Manager</span> for approval
            </div>
            <div className="flex space-x-3">
              <Button type="button" variant="outline" data-testid="button-save-draft">
                Save Draft
              </Button>
              <Button type="submit" data-testid="button-submit-requisition">
                Submit Requisition
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
