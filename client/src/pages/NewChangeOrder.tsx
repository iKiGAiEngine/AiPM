import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Upload } from "lucide-react";
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

const changeOrderSchema = z.object({
  corNumber: z.string().min(1, "COR number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["budget_adjustment", "added_scope"], {
    required_error: "Type is required"
  }),
  originator: z.enum(["rfi", "addendum", "email", "owner_directive", "other"], {
    required_error: "Originator is required"
  }),
  estimatedCost: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  finalCost: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  existingCostCodeId: z.string().optional(),
  newScopeCode: z.string().optional(),
  newScopeDescription: z.string().optional(),
}).refine((data) => {
  // If type is budget_adjustment, existingCostCodeId is required
  if (data.type === "budget_adjustment" && !data.existingCostCodeId) {
    return false;
  }
  // If type is added_scope, newScopeCode is required
  if (data.type === "added_scope" && !data.newScopeCode) {
    return false;
  }
  return true;
}, {
  message: "Cost code information is required based on the selected type",
  path: ["existingCostCodeId"]
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
      type: "budget_adjustment",
      originator: "owner_directive"
    }
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

  // Load existing data for edit mode
  useEffect(() => {
    if (existingChangeOrder && isEdit) {
      form.reset({
        corNumber: existingChangeOrder.corNumber,
        title: existingChangeOrder.title,
        description: existingChangeOrder.description || "",
        type: existingChangeOrder.type,
        originator: existingChangeOrder.originator,
        estimatedCost: existingChangeOrder.estimatedCost?.toString() || "",
        finalCost: existingChangeOrder.finalCost?.toString() || "",
        existingCostCodeId: existingChangeOrder.existingCostCodeId || "",
        newScopeCode: existingChangeOrder.newScopeCode || "",
        newScopeDescription: existingChangeOrder.newScopeDescription || "",
      });
    }
  }, [existingChangeOrder, isEdit, form]);

  // Create/Update mutation
  const saveChangeOrder = useMutation({
    mutationFn: async (data: ChangeOrderForm) => {
      if (!selectedProject) throw new Error("No project selected");
      
      const url = isEdit ? `/api/change-orders/${id}` : '/api/change-orders';
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          ...data,
          projectId: selectedProject.id,
          status: 'draft'
        }),
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

  const watchedType = form.watch("type");

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

      <div className="max-w-2xl">
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
                          <Input {...field} placeholder="COR-001" data-testid="input-cor-number" />
                        </FormControl>
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

            {/* Type & Scope */}
            <Card>
              <CardHeader>
                <CardTitle>Type & Scope</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="budget_adjustment">Budget Adjustment</SelectItem>
                          <SelectItem value="added_scope">Added Scope</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Budget Adjustment modifies existing cost codes, Added Scope creates new work
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedType === "budget_adjustment" && (
                  <FormField
                    control={form.control}
                    name="existingCostCodeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Existing Cost Code *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-existing-cost-code">
                              <SelectValue placeholder="Select cost code to adjust" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {contractEstimates?.map((estimate: any) => (
                              <SelectItem key={estimate.id} value={estimate.id}>
                                {estimate.costCode} - {estimate.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchedType === "added_scope" && (
                  <>
                    <FormField
                      control={form.control}
                      name="newScopeCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Scope Cost Code *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="K25479701-999999-71130" data-testid="input-new-scope-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="newScopeDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Scope Description</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Description of the new scope work" data-testid="input-new-scope-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Cost</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00"
                            data-testid="input-estimated-cost"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="finalCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Final Cost</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00"
                            data-testid="input-final-cost"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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