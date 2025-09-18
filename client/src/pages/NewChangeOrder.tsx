import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Plus, Trash2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { queryClient } from "@/lib/queryClient";

interface NewChangeOrderProps {
  isEdit?: boolean;
}

const changeOrderLineSchema = z.object({
  type: z.enum(["budget_adjustment", "added_scope"]),
  existingCostCodeId: z.string().optional(),
  newScopeCode: z.string().optional(),
  newScopeDescription: z.string().optional(),
  description: z.string().optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  unitCost: z.string().optional(),
  amount: z.string().refine(val => !isNaN(parseFloat(val)), "Amount is required and must be a valid number")
}).refine((data) => {
  if (data.type === "budget_adjustment" && !data.existingCostCodeId) {
    return false;
  }
  if (data.type === "added_scope" && !data.newScopeCode) {
    return false;
  }
  return true;
}, {
  message: "Cost code information is required based on the selected type"
});

const changeOrderSchema = z.object({
  corNumber: z.string().min(1, "COR number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  originator: z.enum(["rfi", "addendum", "email", "owner_directive", "other"], {
    required_error: "Originator is required"
  }),
  lines: z.array(changeOrderLineSchema).min(1, "At least one cost code line is required")
});

type ChangeOrderForm = z.infer<typeof changeOrderSchema>;

export default function NewChangeOrder({ isEdit = false }: NewChangeOrderProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { selectedProject } = useProject();

  const form = useForm<ChangeOrderForm>({
    resolver: zodResolver(changeOrderSchema),
    defaultValues: {
      corNumber: "",
      title: "",
      description: "",
      originator: "owner_directive",
      lines: [{
        type: "budget_adjustment",
        existingCostCodeId: "",
        newScopeCode: "",
        newScopeDescription: "",
        description: "",
        quantity: "",
        unit: "",
        unitCost: "",
        amount: "0"
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines"
  });

  // Query existing change order for edit mode
  const { data: existingChangeOrder } = useQuery({
    queryKey: ['/api/change-orders', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/change-orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch change order');
      return response.json();
    },
    enabled: isEdit && !!id
  });

  // Query contract estimates for budget adjustment type
  const { data: contractEstimates } = useQuery({
    queryKey: ['/api/contract-estimates', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return [];
      const response = await fetch(`/api/contract-estimates?projectId=${selectedProject.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedProject
  });

  // Query CSI codes for new scope items
  const { data: csiCodes } = useQuery({
    queryKey: ['/api/csi-codes'],
    queryFn: async () => {
      const response = await fetch('/api/csi-codes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) return null;
      return response.json();
    }
  });

  // Query next COR number
  const { data: nextCorData } = useQuery({
    queryKey: ['/api/change-orders/next-cor-number', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return null;
      const response = await fetch(`/api/change-orders/next-cor-number/${selectedProject.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!selectedProject && !isEdit
  });

  // Auto-populate COR number for new change orders
  useEffect(() => {
    if (nextCorData && !isEdit) {
      form.setValue('corNumber', nextCorData.nextCorNumber);
    }
  }, [nextCorData, isEdit, form]);

  // Load existing data for edit mode
  useEffect(() => {
    if (existingChangeOrder && isEdit) {
      form.reset({
        corNumber: existingChangeOrder.corNumber,
        title: existingChangeOrder.title,
        description: existingChangeOrder.description || "",
        originator: existingChangeOrder.originator,
        lines: existingChangeOrder.lines?.length > 0 ? existingChangeOrder.lines.map((line: any) => ({
          type: line.type,
          existingCostCodeId: line.existingCostCodeId || "",
          newScopeCode: line.newScopeCode || "",
          newScopeDescription: line.newScopeDescription || "",
          description: line.description || "",
          quantity: line.quantity?.toString() || "",
          unit: line.unit || "",
          unitCost: line.unitCost?.toString() || "",
          amount: line.amount?.toString() || "0"
        })) : [{
          type: "budget_adjustment",
          existingCostCodeId: "",
          newScopeCode: "",
          newScopeDescription: "",
          description: "",
          quantity: "",
          unit: "",
          unitCost: "",
          amount: "0"
        }]
      });
    }
  }, [existingChangeOrder, isEdit, form]);

  // Calculate total amount from all lines
  const calculateTotal = () => {
    const lines = form.watch("lines") || [];
    return lines.reduce((total, line) => {
      const amount = parseFloat(line.amount || "0");
      return total + (isNaN(amount) ? 0 : amount);
    }, 0);
  };

  // Auto-calculate amount when quantity and unit cost change
  const calculateLineAmount = (index: number) => {
    const line = form.watch(`lines.${index}`);
    const quantity = parseFloat(line.quantity || "0");
    const unitCost = parseFloat(line.unitCost || "0");
    
    if (!isNaN(quantity) && !isNaN(unitCost)) {
      const amount = quantity * unitCost;
      form.setValue(`lines.${index}.amount`, amount.toFixed(2));
    }
  };

  // Create/Update mutation
  const saveChangeOrder = useMutation({
    mutationFn: async (data: ChangeOrderForm) => {
      if (!selectedProject) throw new Error("No project selected");
      
      const url = isEdit ? `/api/change-orders/${id}` : '/api/change-orders';
      const method = isEdit ? 'PUT' : 'POST';
      
      // Transform data for API - NEVER send COR number (server generates it)
      const { corNumber, ...dataWithoutCor } = data;
      const transformedData = {
        ...dataWithoutCor,
        projectId: selectedProject.id,
        status: 'draft',
        lines: data.lines.map(line => ({
          ...line,
          quantity: line.quantity ? parseFloat(line.quantity) : undefined,
          unitCost: line.unitCost ? parseFloat(line.unitCost) : undefined,
          amount: parseFloat(line.amount)
        }))
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(transformedData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${isEdit ? 'update' : 'create'} change order`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: `Change Order ${isEdit ? 'Updated' : 'Created'}`,
        description: `${data.corNumber} has been ${isEdit ? 'updated' : 'created'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/change-orders'] });
      navigate(`/change-orders/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ChangeOrderForm) => {
    saveChangeOrder.mutate(data);
  };

  if (!selectedProject) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Project Selected</CardTitle>
            <CardDescription>
              Please select a project to create a change order.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/change-orders')} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {isEdit ? 'Edit Change Order' : 'New Change Order'}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Update change order details' : 'Create a new change order for'} {selectedProject.name}
          </p>
        </div>
      </div>

      <div className="max-w-4xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="corNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>COR Number *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Loading..." 
                            data-testid="input-cor-number"
                            readOnly
                            disabled
                            className="bg-muted cursor-not-allowed"
                          />
                        </FormControl>
                        <FormDescription>
                          Automatically generated consecutive number
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="originator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Originator *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-originator">
                              <SelectValue placeholder="Select originator" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="rfi">RFI</SelectItem>
                            <SelectItem value="addendum">Addendum</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="owner_directive">Owner Directive</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Brief description of the change order" data-testid="input-title" />
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
                          {...field} 
                          placeholder="Detailed description of the change order..."
                          rows={3}
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Cost Code Line Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Cost Code Line Items</CardTitle>
                    <CardDescription>
                      Add multiple cost codes with amounts. Similar to CMiC PCI Change Orders.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({
                      type: "budget_adjustment",
                      existingCostCodeId: "",
                      newScopeCode: "",
                      newScopeDescription: "",
                      description: "",
                      quantity: "",
                      unit: "",
                      unitCost: "",
                      amount: "0"
                    })}
                    data-testid="button-add-line"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Line Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {fields.map((field, index) => (
                  <Card key={field.id} className="border-dashed">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Line {index + 1}</CardTitle>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            data-testid={`button-remove-line-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name={`lines.${index}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid={`select-type-${index}`}>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="budget_adjustment">Budget Adjustment</SelectItem>
                                <SelectItem value="added_scope">Added Scope</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch(`lines.${index}.type`) === "budget_adjustment" && (
                        <FormField
                          control={form.control}
                          name={`lines.${index}.existingCostCodeId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Existing Cost Code *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid={`select-existing-cost-code-${index}`}>
                                    <SelectValue placeholder="Select cost code to adjust" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {contractEstimates?.map((estimate: any) => (
                                    <SelectItem key={estimate.id} value={estimate.id}>
                                      {estimate.costCode} - {estimate.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {form.watch(`lines.${index}.type`) === "added_scope" && (
                        <>
                          <FormField
                            control={form.control}
                            name={`lines.${index}.newScopeCode`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Scope Cost Code *</FormLabel>
                                <Select 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    // Auto-fill description when CSI code is selected
                                    const selectedDivision = csiCodes?.divisions_list?.find((div: any) => div.csi === value);
                                    if (selectedDivision) {
                                      form.setValue(`lines.${index}.newScopeDescription`, selectedDivision.description);
                                    }
                                  }} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid={`select-new-scope-code-${index}`}>
                                      <SelectValue placeholder="Select CSI code for new scope" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {csiCodes?.divisions_list?.map((division: any) => (
                                      <SelectItem key={division.csi} value={division.csi}>
                                        {division.code} - {division.description}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  CSI MasterFormat codes for standardized categorization
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`lines.${index}.newScopeDescription`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Scope Description</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Description of the new scope work" data-testid={`input-new-scope-description-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      <FormField
                        control={form.control}
                        name={`lines.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Line Description</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Description of this line item" data-testid={`input-line-description-${index}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.01" 
                                  placeholder="0"
                                  data-testid={`input-quantity-${index}`}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    setTimeout(() => calculateLineAmount(index), 100);
                                  }}
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
                              <FormLabel>Unit</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="EA, SF, LF" data-testid={`input-unit-${index}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`lines.${index}.unitCost`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Cost</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.01" 
                                  placeholder="0.00"
                                  data-testid={`input-unit-cost-${index}`}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    setTimeout(() => calculateLineAmount(index), 100);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`lines.${index}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount *</FormLabel>
                              <div className="relative">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01" 
                                    placeholder="0.00"
                                    data-testid={`input-amount-${index}`}
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-1 top-1 h-6 w-6 p-0"
                                  onClick={() => calculateLineAmount(index)}
                                  data-testid={`button-calculate-${index}`}
                                >
                                  <Calculator className="w-3 h-3" />
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Total Amount */}
                <div className="flex justify-end">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                    <div className="text-2xl font-semibold" data-testid="text-total-amount">
                      ${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/change-orders')}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saveChangeOrder.isPending}
                data-testid="button-save"
              >
                {saveChangeOrder.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    {isEdit ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEdit ? 'Update Change Order' : 'Create Change Order'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}