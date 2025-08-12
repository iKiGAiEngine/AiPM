import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Trash2, MapPin, Calendar, Package } from 'lucide-react';
import type { Project, ProjectZone, Material } from '@/types';

const requisitionLineSchema = z.object({
  materialId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(0.001, 'Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  estimatedCost: z.coerce.number().optional(),
  costCode: z.string().optional(),
  notes: z.string().optional(),
});

const requisitionSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  zoneId: z.string().optional(),
  targetDeliveryDate: z.string().optional(),
  deliveryLocation: z.string().optional(),
  specialInstructions: z.string().optional(),
  lines: z.array(requisitionLineSchema).min(1, 'At least one line item is required'),
});

type RequisitionFormData = z.infer<typeof requisitionSchema>;

interface RequisitionFormProps {
  onSuccess?: () => void;
}

export function RequisitionForm({ onSuccess }: RequisitionFormProps) {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [materialSearch, setMaterialSearch] = useState('');

  const form = useForm<RequisitionFormData>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      projectId: '',
      zoneId: '',
      targetDeliveryDate: '',
      deliveryLocation: '',
      specialInstructions: '',
      lines: [
        {
          description: '',
          quantity: 1,
          unit: 'each',
          estimatedCost: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/projects`],
    enabled: !!currentOrganization?.id,
  });

  const { data: zones } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/projects/${form.watch('projectId')}`],
    enabled: !!currentOrganization?.id && !!form.watch('projectId'),
  });

  const { data: materials } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/materials/search`, materialSearch],
    enabled: !!currentOrganization?.id && materialSearch.length > 2,
  });

  const createRequisitionMutation = useMutation({
    mutationFn: async (data: RequisitionFormData) => {
      const response = await apiRequest('POST', `/api/${currentOrganization?.id}/requisitions`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/${currentOrganization?.id}/requisitions`] });
      toast({
        title: 'Success',
        description: 'Requisition created successfully',
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create requisition',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: RequisitionFormData) => {
    createRequisitionMutation.mutate(data);
  };

  const addLineItem = () => {
    append({
      description: '',
      quantity: 1,
      unit: 'each',
      estimatedCost: 0,
    });
  };

  const removeLineItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const fillFromMaterial = (material: Material, lineIndex: number) => {
    form.setValue(`lines.${lineIndex}.materialId`, material.id);
    form.setValue(`lines.${lineIndex}.description`, material.description);
    form.setValue(`lines.${lineIndex}.unit`, material.unit);
    if (material.lastCost) {
      form.setValue(`lines.${lineIndex}.estimatedCost`, material.lastCost);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Requisition Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projectsLoading ? (
                          <SelectItem value="loading">Loading projects...</SelectItem>
                        ) : projects?.length > 0 ? (
                          projects.map((project: Project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-projects">No projects available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Zone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-zone">
                          <SelectValue placeholder="Select zone (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {zones?.zones?.length > 0 ? (
                          zones.zones.map((zone: ProjectZone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-zones">No zones available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetDeliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Target Delivery Date</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        data-testid="input-delivery-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>Delivery Location</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Building entrance, staging area, etc." 
                        {...field} 
                        data-testid="input-delivery-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="specialInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Installation notes, handling requirements, etc."
                      className="min-h-[80px]"
                      {...field}
                      data-testid="textarea-special-instructions"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Material Line Items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                data-testid="button-add-line-item"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-4 p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Item #{index + 1}</h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      data-testid={`button-remove-line-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`lines.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter material description"
                              {...field}
                              data-testid={`input-description-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`lines.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            {...field}
                            data-testid={`input-quantity-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lines.${index}.unit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid={`select-unit-${index}`}>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="each">Each</SelectItem>
                            <SelectItem value="box">Box</SelectItem>
                            <SelectItem value="case">Case</SelectItem>
                            <SelectItem value="linear_foot">Linear Foot</SelectItem>
                            <SelectItem value="square_foot">Square Foot</SelectItem>
                            <SelectItem value="pound">Pound</SelectItem>
                            <SelectItem value="gallon">Gallon</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lines.${index}.estimatedCost`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Cost</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            data-testid={`input-cost-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lines.${index}.costCode`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 10.28.00"
                            {...field}
                            data-testid={`input-cost-code-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`lines.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Specifications, color, finish, etc."
                              className="min-h-[60px]"
                              {...field}
                              data-testid={`textarea-notes-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {index < fields.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Requisition will be submitted for approval
          </div>
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createRequisitionMutation.isPending}
              data-testid="button-submit-requisition"
            >
              {createRequisitionMutation.isPending ? 'Creating...' : 'Create Requisition'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
