import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Truck, Save, ArrowLeft, Plus, Trash2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Vendor, PurchaseOrder, PurchaseOrderLine, Project } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

// Form schema for delivery creation
const deliveryFormSchema = z.object({
  poId: z.string().optional(),
  vendorId: z.string().min(1, "Vendor is required"),
  deliveryDate: z.date({
    required_error: "Delivery date is required",
  }),
  packingSlipNumber: z.string().optional(),
  trackingNumber: z.string().optional(),
  status: z.enum(["pending", "partial", "complete", "damaged"]).default("pending"),
  notes: z.string().optional(),
  lines: z.array(z.object({
    poLineId: z.string().optional(),
    description: z.string().min(1, "Description is required"),
    quantityOrdered: z.number().optional(),
    quantityReceived: z.number().min(0, "Quantity received must be positive"),
    quantityDamaged: z.number().min(0).optional(),
    discrepancyNotes: z.string().optional(),
  })).optional(),
});

type DeliveryFormData = z.infer<typeof deliveryFormSchema>;

export default function NewDelivery() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPoLineSelector, setShowPoLineSelector] = useState(false);
  const [selectedPoLines, setSelectedPoLines] = useState<string[]>([]);
  const [poLineQuantities, setPoLineQuantities] = useState<Record<string, number>>({});
  const [previouslyReceived, setPreviouslyReceived] = useState<Record<string, number>>({});

  const form = useForm<DeliveryFormData>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      poId: "none",
      vendorId: "",
      deliveryDate: new Date(),
      packingSlipNumber: "",
      trackingNumber: "",
      status: "pending",
      notes: "",
      lines: [],
    },
  });

  // Fetch vendors for the dropdown
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  // Watch vendor ID to filter purchase orders
  const selectedVendorId = form.watch("vendorId");

  // Fetch purchase orders for the dropdown with vendor filtering
  const { data: purchaseOrders = [] } = useQuery<any[]>({
    queryKey: ['/api/purchase-orders', selectedVendorId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedVendorId && selectedVendorId !== "") {
        params.append('vendorId', selectedVendorId);
      }
      
      // Add forDelivery parameter to get only POs with remaining quantities
      params.append('forDelivery', 'true');
      
      const response = await fetch(`/api/purchase-orders?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch purchase orders');
      return response.json(); // Server now handles filtering
    },
  });

  // Get selected PO details including lines
  const selectedPoId = form.watch("poId");
  const { data: poLines = [] } = useQuery<PurchaseOrderLine[]>({
    queryKey: ['/api/purchase-orders', selectedPoId, 'lines'],
    enabled: !!selectedPoId && selectedPoId !== "none",
    queryFn: async () => {
      const response = await fetch(`/api/purchase-orders/${selectedPoId}/lines`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch PO lines');
      return response.json();
    },
  });

  // Get previously delivered quantities for the selected PO
  const { data: deliveredQuantities = {} } = useQuery<Record<string, number>>({
    queryKey: ['/api/purchase-orders', selectedPoId, 'delivered-quantities'],
    enabled: !!selectedPoId && selectedPoId !== "none",
    queryFn: async () => {
      const response = await fetch(`/api/purchase-orders/${selectedPoId}/delivered-quantities`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch delivered quantities');
      return response.json();
    },
  });

  // Initialize quantities when PO lines and delivered quantities are loaded
  useEffect(() => {
    if (poLines.length > 0) {
      const quantities: Record<string, number> = {};
      const received: Record<string, number> = {};
      
      poLines.forEach(line => {
        const ordered = parseInt(line.quantity);
        const previouslyDelivered = deliveredQuantities[line.id] || 0;
        const remaining = Math.max(0, ordered - previouslyDelivered);
        
        quantities[line.id] = remaining; // Default to remaining quantity
        received[line.id] = previouslyDelivered;
      });
      
      setPoLineQuantities(quantities);
      setPreviouslyReceived(received);
      
      // Select only lines that have remaining quantities
      const linesWithRemaining = poLines.filter(line => {
        const ordered = parseInt(line.quantity);
        const previouslyDelivered = deliveredQuantities[line.id] || 0;
        return ordered > previouslyDelivered;
      });
      
      setSelectedPoLines(linesWithRemaining.map(line => line.id));
    }
  }, [poLines, deliveredQuantities]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  // Calculate delivery status based on quantities
  const calculateDeliveryStatus = (lines: DeliveryFormData['lines']) => {
    if (!lines || lines.length === 0) return 'pending';
    
    let allItemsFullyReceived = true;
    let someItemsReceived = false;
    
    for (const line of lines) {
      const ordered = line.quantityOrdered || 0;
      const received = line.quantityReceived || 0;
      
      if (received > 0) {
        someItemsReceived = true;
      }
      
      if (received < ordered) {
        allItemsFullyReceived = false;
      }
    }
    
    // If all items are fully received, it's complete
    if (allItemsFullyReceived && someItemsReceived) {
      return 'complete';
    }
    
    // If some items are received but not all are fully received, it's partial
    if (someItemsReceived) {
      return 'partial';
    }
    
    return 'pending';
  };

  const createDeliveryMutation = useMutation({
    mutationFn: async (data: DeliveryFormData) => {
      // Calculate status automatically
      const status = calculateDeliveryStatus(data.lines);
      
      // Get current user info for organizationId and receiverId
      const userResponse = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get current user');
      }
      
      const currentUser = await userResponse.json();
      
      const response = await fetch('/api/deliveries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          ...data,
          organizationId: currentUser.organizationId,
          receiverId: currentUser.id,
          poId: data.poId === "none" ? null : data.poId, // Convert "none" to null
          status, // Use calculated status
          lines: data.lines || [], // Include delivery lines
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create delivery');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Delivery recorded successfully",
        description: "The delivery has been added to the system.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deliveries'] });
      navigate('/deliveries');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to record delivery",
        description: error.message || "Please check the form and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: DeliveryFormData) => {
    setIsSubmitting(true);
    try {
      await createDeliveryMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/deliveries')} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Deliveries
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Record New Delivery</h1>
          <p className="text-muted-foreground">Record materials received at the site</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Delivery Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vendor Selection */}
                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor *</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Clear PO selection when vendor changes
                          if (value !== field.value) {
                            form.setValue("poId", "none");
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-vendor">
                            <SelectValue placeholder="Select a vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Purchase Order (Optional) */}
                <FormField
                  control={form.control}
                  name="poId"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Purchase Order (Optional)</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Auto-populate vendor when PO is selected
                          if (value !== "none") {
                            const selectedPO = purchaseOrders.find(po => po.id === value);
                            if (selectedPO?.vendor?.id) {
                              form.setValue("vendorId", selectedPO.vendor.id);
                            }
                          }
                        }} 
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-purchase-order">
                            <SelectValue placeholder="Select a purchase order" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Purchase Order</SelectItem>
                          {purchaseOrders.map((po) => (
                            <div key={po.id} className="flex flex-col">
                              <SelectItem value={po.id}>
                                <div className="flex flex-col space-y-1">
                                  <div className="font-medium">{po.number}</div>
                                  {po.project?.name && (
                                    <div className="text-sm text-muted-foreground">
                                      {po.project.projectNumber ? `${po.project.projectNumber} - ` : ""}{po.project.name}
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Delivery Date */}
                <FormField
                  control={form.control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Delivery Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-delivery-date"
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
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="complete">Complete</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Packing Slip Number */}
                <FormField
                  control={form.control}
                  name="packingSlipNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Packing Slip Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter packing slip number"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-packing-slip"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tracking Number */}
                <FormField
                  control={form.control}
                  name="trackingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter tracking number"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-tracking-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Delivery Lines */}
              <Card className="bg-muted/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Confirm Delivery Items</CardTitle>
                    <div className="flex gap-2">
                      {selectedPoId && selectedPoId !== "none" && poLines.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowPoLineSelector(true);
                          }}
                          data-testid="button-populate-po-lines"
                        >
                          Load from PO
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({
                          poLineId: "",
                          description: "",
                          quantityOrdered: 0,
                          quantityReceived: 0,
                          quantityDamaged: 0,
                          discrepancyNotes: "",
                        })}
                        data-testid="button-add-line"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.length === 0 && (
                    <p className="text-muted-foreground text-center py-6">
                      {selectedPoId && selectedPoId !== "none" 
                        ? "Click 'Load from PO' to import purchase order items, or 'Add Item' to manually add items."
                        : "Add items to track what was delivered. This is especially useful for partial deliveries."
                      }
                    </p>
                  )}
                  
                  {fields.map((field, index) => (
                    <div key={field.id} className="relative p-4 border border-border rounded-lg bg-background">
                      {/* Row 1: Item details (read-only) */}
                      <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 mb-3">
                        {/* Description - Read Only */}
                        <div className="lg:col-span-5">
                          <FormLabel className="text-sm font-medium">Description</FormLabel>
                          <div className="mt-1 p-2 bg-muted/30 rounded-md text-sm min-h-[40px] flex items-center">
                            {form.watch(`lines.${index}.description`) || "No description"}
                          </div>
                        </div>

                        {/* Ordered Quantity - Read Only */}
                        <div className="lg:col-span-2">
                          <FormLabel className="text-sm font-medium">Ordered</FormLabel>
                          <div className="mt-1 p-2 bg-muted/30 rounded-md text-sm min-h-[40px] flex items-center justify-center font-mono">
                            {form.watch(`lines.${index}.quantityOrdered`) || 0}
                          </div>
                        </div>

                        {/* Received Quantity - Read Only */}
                        <div className="lg:col-span-2">
                          <FormLabel className="text-sm font-medium">Received</FormLabel>
                          <div className="mt-1 p-2 bg-muted/30 rounded-md text-sm min-h-[40px] flex items-center justify-center font-mono">
                            {form.watch(`lines.${index}.quantityReceived`) || 0}
                          </div>
                        </div>

                        {/* Damaged Quantity - Editable */}
                        <div className="lg:col-span-2">
                          <FormField
                            control={form.control}
                            name={`lines.${index}.quantityDamaged`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Damaged</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="1"
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    className="text-center font-mono"
                                    data-testid={`input-line-damaged-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Row 2: Notes - Editable */}
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.discrepancyNotes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Notes / Discrepancies</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Add notes about discrepancies, damage, or missing items..."
                                  className="min-h-[60px] resize-none"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid={`textarea-line-notes-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Remove Button - positioned in top right */}
                      <div className="absolute top-2 right-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-destructive hover:text-destructive h-6 w-6 p-0"
                          data-testid={`button-remove-line-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* PO Line Selector Modal */}
              {showPoLineSelector && (
                <Card className="border-2 border-primary bg-primary/5">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Select Items from Purchase Order</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowPoLineSelector(false);
                          setSelectedPoLines([]);
                          setPoLineQuantities({});
                        }}
                        data-testid="button-close-po-selector"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Only remaining items that need delivery are shown below. Previously received quantities are tracked separately. Select items and adjust quantities for this delivery.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {poLines
                      .filter(line => {
                        // Only show lines that have remaining quantity to deliver
                        const ordered = parseInt(line.quantity);
                        const previouslyDelivered = previouslyReceived[line.id] || 0;
                        return ordered > previouslyDelivered;
                      })
                      .map((line) => (
                      <div
                        key={line.id}
                        className="flex items-center space-x-4 p-3 border border-border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedPoLines.includes(line.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPoLines([...selectedPoLines, line.id]);
                            } else {
                              setSelectedPoLines(selectedPoLines.filter(id => id !== line.id));
                            }
                          }}
                          data-testid={`checkbox-po-line-${line.id}`}
                        />
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                          <div className="font-medium text-sm">{line.description}</div>
                          <div className="text-sm text-muted-foreground">
                            Ordered: {line.quantity} {line.unit}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Previously Received: {previouslyReceived[line.id] || 0} {line.unit}
                          </div>
                          <div className="text-sm font-medium text-primary">
                            Available to Receive: {Math.max(0, parseInt(line.quantity) - (previouslyReceived[line.id] || 0))} {line.unit}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Qty:</span>
                              <Input
                                type="number"
                                step="1"
                                value={poLineQuantities[line.id] || ""}
                                onChange={(e) => {
                                  const newQty = parseInt(e.target.value) || 0;
                                  const maxAllowed = parseInt(line.quantity) - (previouslyReceived[line.id] || 0);
                                  const adjustedQty = Math.min(newQty, maxAllowed);
                                  setPoLineQuantities(prev => ({
                                    ...prev,
                                    [line.id]: adjustedQty
                                  }));
                                }}
                                className="w-20 h-8 text-sm"
                                disabled={!selectedPoLines.includes(line.id)}
                                max={parseInt(line.quantity) - (previouslyReceived[line.id] || 0)}
                                data-testid={`input-po-line-qty-${line.id}`}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Remaining: {Math.max(0, parseInt(line.quantity) - (previouslyReceived[line.id] || 0) - (poLineQuantities[line.id] || 0))} {line.unit}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex gap-2 mt-4">
                      <Button
                        type="button"
                        variant="default"
                        onClick={() => {
                          // Clear existing lines first
                          while (fields.length > 0) {
                            remove(0);
                          }
                          
                          // Add only selected PO lines with their adjusted quantities
                          const linesToAdd = poLines
                            .filter(line => selectedPoLines.includes(line.id))
                            .map(line => ({
                              poLineId: line.id,
                              description: line.description,
                              quantityOrdered: parseInt(line.quantity),
                              quantityReceived: poLineQuantities[line.id] || 0,
                              quantityDamaged: 0,
                              discrepancyNotes: "",
                            }));
                          
                          linesToAdd.forEach(line => append(line));
                          
                          setShowPoLineSelector(false);
                          setSelectedPoLines([]);
                          setPoLineQuantities({});
                          
                          toast({
                            title: "Items Added",
                            description: `${linesToAdd.length} items added to delivery record.`,
                          });
                        }}
                        disabled={selectedPoLines.length === 0}
                        data-testid="button-add-selected-lines"
                      >
                        Add Selected Items ({selectedPoLines.length})
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowPoLineSelector(false);
                          setSelectedPoLines([]);
                          setPoLineQuantities({});
                        }}
                        data-testid="button-cancel-selection"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>General Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any general notes about the delivery..."
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/deliveries')}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="button-submit"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Recording..." : "Record Delivery"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}