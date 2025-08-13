import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const mockProjects = [
  { id: '1', name: 'Metro Plaza Office Tower' },
  { id: '2', name: 'Riverside Medical Center' },
];

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
              <Select onValueChange={(value) => form.setValue('projectId', value)}>
                <SelectTrigger data-testid="select-project">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {mockProjects.map((project) => (
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

          {/* Material Search */}
          <div className="space-y-2">
            <Label htmlFor="materialSearch">Search Materials</Label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search catalog by SKU, description, or manufacturer..."
                className="pr-10"
                data-testid="input-material-search"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
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
            
            {form.watch('lines')?.map((line, index) => (
              <div key={index} className="p-4 border border-border rounded-lg space-y-4">
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
                  <div className="flex items-end">
                    {form.watch('lines')?.length > 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeLineItem(index)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-remove-line-${index}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                {line.notes !== undefined && (
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      {...form.register(`lines.${index}.notes`)}
                      placeholder="Additional notes for this item"
                      rows={2}
                      data-testid={`input-line-notes-${index}`}
                    />
                  </div>
                )}
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
