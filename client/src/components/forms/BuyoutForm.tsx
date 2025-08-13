import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { CalendarIcon, Plus, Trash2, Send, Users, Package } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Requisition, RequisitionLine, Project, Vendor } from "@shared/schema";

// Buyout (RFQ) schema
const buyoutSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  requisitionId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  bidDueDate: z.date({
    required_error: "Bid due date is required",
  }),
  shipToAddress: z.string().optional(),
  selectedVendors: z.array(z.string()).min(1, "At least one vendor must be selected"),
  lines: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.number().min(0.01, "Quantity must be greater than 0"),
    unit: z.string().min(1, "Unit is required"),
    materialId: z.string().optional(),
  })).min(1, "At least one line item is required"),
});

type BuyoutFormData = z.infer<typeof buyoutSchema>;

interface BuyoutFormProps {
  fromRequisition?: Requisition;
}

export default function BuyoutForm({ fromRequisition }: BuyoutFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [requisitionLines, setRequisitionLines] = useState<RequisitionLine[]>([]);

  // Fetch requisition lines if from requisition
  const { data: fetchedLines } = useQuery<RequisitionLine[]>({
    queryKey: ['/api/requisitions', fromRequisition?.id, 'lines'],
    queryFn: async () => {
      const response = await fetch(`/api/requisitions/${fromRequisition?.id}/lines`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!fromRequisition?.id,
  });

  // Fetch projects
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

  // Fetch vendors
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
    queryFn: async () => {
      const response = await fetch('/api/vendors', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch vendors');
      return response.json();
    },
  });

  const form = useForm<BuyoutFormData>({
    resolver: zodResolver(buyoutSchema),
    defaultValues: {
      projectId: fromRequisition?.projectId || '',
      requisitionId: fromRequisition?.id || '',
      title: fromRequisition ? `Buyout for ${fromRequisition.title}` : '',
      description: '',
      bidDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days from now
      shipToAddress: '',
      selectedVendors: [],
      lines: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  // Update form when requisition lines are fetched
  useEffect(() => {
    if (fetchedLines && fetchedLines.length > 0) {
      setRequisitionLines(fetchedLines);
      
      // Clear existing lines and add requisition lines
      form.setValue('lines', []);
      fetchedLines.forEach(line => {
        append({
          description: line.description,
          quantity: Number(line.quantity),
          unit: line.unit,
          materialId: line.materialId || undefined,
        });
      });
    }
  }, [fetchedLines, append, form]);

  // Create RFQ mutation
  const createRFQMutation = useMutation({
    mutationFn: async (data: BuyoutFormData) => {
      const response = await fetch('/api/rfqs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          projectId: data.projectId,
          title: data.title,
          description: data.description || '',
          bidDueDate: data.bidDueDate.toISOString(),
          shipToAddress: data.shipToAddress || '',
          vendorIds: data.selectedVendors,
          lines: data.lines || [],
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create RFQ');
      }
      
      return response.json();
    },
    onSuccess: (rfq) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rfqs'] });
      
      // Update requisition status to 'converted' if from requisition
      if (fromRequisition) {
        updateRequisitionMutation.mutate(fromRequisition.id);
      }
      
      toast({
        title: 'Success',
        description: `Buyout RFQ ${rfq.number} created successfully`,
      });
      
      navigate('/rfqs');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create buyout RFQ',
        variant: 'destructive',
      });
    },
  });

  // Update requisition status mutation
  const updateRequisitionMutation = useMutation({
    mutationFn: async (requisitionId: string) => {
      const response = await fetch(`/api/requisitions/${requisitionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ status: 'converted' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update requisition status');
      }
    },
  });

  const onSubmit = (data: BuyoutFormData) => {
    createRFQMutation.mutate(data);
  };

  const handleVendorToggle = (vendorId: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedVendors, vendorId]
      : selectedVendors.filter(id => id !== vendorId);
    
    setSelectedVendors(updated);
    form.setValue('selectedVendors', updated);
  };

  const addLineItem = () => {
    append({
      description: '',
      quantity: 1,
      unit: 'Each',
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              RFQ Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bidDueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Bid Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                  <FormLabel>RFQ Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter RFQ title" {...field} />
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
                      placeholder="Additional information for vendors..."
                      rows={3}
                      {...field} 
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
                  <FormLabel>Ship To Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Delivery address (leave blank for jobsite)"
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Leave blank to use project jobsite address
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Vendor Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select Vendors ({selectedVendors.length} selected)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vendors.length === 0 ? (
              <p className="text-muted-foreground">No vendors available. Add vendors first.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vendors.map((vendor) => (
                  <div key={vendor.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={vendor.id}
                      checked={selectedVendors.includes(vendor.id)}
                      onCheckedChange={(checked) => handleVendorToggle(vendor.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={vendor.id} className="font-medium cursor-pointer">
                        {vendor.company}
                      </Label>
                      <p className="text-sm text-muted-foreground">{vendor.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <FormMessage />
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items ({fields.length})</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No line items yet. Add items to request quotes.</p>
                <Button type="button" variant="outline" onClick={addLineItem} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Item
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-lg">
                    <div className="md:col-span-5">
                      <FormField
                        control={form.control}
                        name={`lines.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="sr-only">Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Material description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`lines.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="sr-only">Quantity</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="Qty"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`lines.${index}.unit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="sr-only">Unit</FormLabel>
                            <FormControl>
                              <Input placeholder="Unit" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="md:col-span-3 flex items-center justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/rfqs')}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createRFQMutation.isPending}
            className="min-w-32"
          >
            {createRFQMutation.isPending ? (
              <>Creating...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Create Buyout
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}