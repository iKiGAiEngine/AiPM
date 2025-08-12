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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Trash2, Calendar, Building, Mail } from 'lucide-react';
import type { Project, Vendor, Requisition } from '@/types';

const rfqLineSchema = z.object({
  materialId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(0.001, 'Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
});

const rfqSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  requisitionId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  bidDueDate: z.string().optional(),
  shipToAddress: z.string().optional(),
  selectedVendors: z.array(z.string()).min(1, 'At least one vendor must be selected'),
  lines: z.array(rfqLineSchema).min(1, 'At least one line item is required'),
});

type RFQFormData = z.infer<typeof rfqSchema>;

interface RFQFormProps {
  onSuccess?: () => void;
  fromRequisition?: Requisition;
}

export function RFQForm({ onSuccess, fromRequisition }: RFQFormProps) {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RFQFormData>({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      projectId: fromRequisition?.projectId || '',
      requisitionId: fromRequisition?.id || '',
      title: '',
      description: '',
      bidDueDate: '',
      shipToAddress: '',
      selectedVendors: [],
      lines: fromRequisition?.lines?.map(line => ({
        materialId: line.materialId,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
      })) || [
        {
          description: '',
          quantity: 1,
          unit: 'each',
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

  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/vendors`],
    enabled: !!currentOrganization?.id,
  });

  const { data: requisitions } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/requisitions`],
    enabled: !!currentOrganization?.id && !fromRequisition,
  });

  const createRFQMutation = useMutation({
    mutationFn: async (data: RFQFormData) => {
      const response = await apiRequest('POST', `/api/${currentOrganization?.id}/rfqs`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/${currentOrganization?.id}/rfqs`] });
      toast({
        title: 'Success',
        description: 'RFQ created successfully',
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create RFQ',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: RFQFormData) => {
    createRFQMutation.mutate(data);
  };

  const addLineItem = () => {
    append({
      description: '',
      quantity: 1,
      unit: 'each',
    });
  };

  const removeLineItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const loadFromRequisition = (requisitionId: string) => {
    const requisition = requisitions?.find((r: Requisition) => r.id === requisitionId);
    if (requisition) {
      form.setValue('projectId', requisition.projectId);
      form.setValue('title', `Materials for ${requisition.number}`);
      form.setValue('shipToAddress', requisition.deliveryLocation || '');
      
      // Replace lines with requisition lines
      form.setValue('lines', requisition.lines?.map(line => ({
        materialId: line.materialId,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
      })) || []);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>RFQ Details</span>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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

              {!fromRequisition && (
                <FormField
                  control={form.control}
                  name="requisitionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Requisition</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== 'manual') {
                          loadFromRequisition(value);
                        }
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-requisition">
                            <SelectValue placeholder="Select requisition (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Create Manually</SelectItem>
                          {requisitions?.filter((r: Requisition) => r.status === 'approved').map((requisition: Requisition) => (
                            <SelectItem key={requisition.id} value={requisition.id}>
                              {requisition.number} - {requisition.project?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RFQ Title *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Restroom Accessories - Zone B-3"
                      {...field} 
                      data-testid="input-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed scope of work and requirements..."
                      className="min-h-[80px]"
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bidDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Bid Due Date</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        {...field} 
                        data-testid="input-due-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shipToAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <Building className="h-4 w-4" />
                      <span>Ship To Address</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Delivery address for materials"
                        {...field} 
                        data-testid="input-ship-to"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Vendor Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="selectedVendors"
              render={() => (
                <FormItem>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vendorsLoading ? (
                      <div className="col-span-full text-center py-4">Loading vendors...</div>
                    ) : vendors?.length > 0 ? (
                      vendors.map((vendor: Vendor) => (
                        <FormField
                          key={vendor.id}
                          control={form.control}
                          name="selectedVendors"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={vendor.id}
                                className="flex flex-row items-start space-x-3 space-y-0 border border-border rounded-lg p-3"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(vendor.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, vendor.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== vendor.id
                                            )
                                          )
                                    }}
                                    data-testid={`checkbox-vendor-${vendor.id}`}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm font-medium">
                                    {vendor.name}
                                  </FormLabel>
                                  <p className="text-xs text-muted-foreground">
                                    {vendor.email || 'No email'}
                                  </p>
                                </div>
                              </FormItem>
                            )
                          }}
                        />
                      ))
                    ) : (
                      <div className="col-span-full text-center py-4 text-muted-foreground">
                        No vendors available
                      </div>
                    )}
                  </div>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <FormField
                      control={form.control}
                      name={`lines.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Detailed material description"
                              className="min-h-[80px]"
                              {...field}
                              data-testid={`textarea-description-${index}`}
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                </div>

                {index < fields.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <div className="text-sm text-muted-foreground">
            RFQ will be created and ready to send to selected vendors
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
              disabled={createRFQMutation.isPending}
              data-testid="button-submit-rfq"
            >
              {createRFQMutation.isPending ? 'Creating...' : 'Create RFQ'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
