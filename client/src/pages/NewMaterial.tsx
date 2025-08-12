import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { insertMaterialSchema } from "@shared/schema";
import type { InsertMaterial } from "@shared/schema";

const materialFormSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  description: z.string().min(1, "Description is required"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  category: z.string().optional(),
  finish: z.string().optional(),
  lastCost: z.string().min(1, "Last cost is required"),
  leadTimeDays: z.string().min(1, "Lead time is required"),
  minOrderQty: z.string().optional(),
  substitutable: z.boolean().default(true),
});

type MaterialFormData = z.infer<typeof materialFormSchema>;

const categories = [
  "Plumbing",
  "Electrical", 
  "HVAC",
  "Structural",
  "Finishes",
  "Doors & Windows",
  "Roofing",
  "Insulation",
  "Concrete",
  "Steel",
  "Other"
];

const units = [
  "Each",
  "Linear Foot",
  "Square Foot", 
  "Cubic Foot",
  "Cubic Yard",
  "Pound",
  "Ton",
  "Box",
  "Case",
  "Roll",
  "Bundle",
  "Sheet"
];

export default function NewMaterial() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      sku: "",
      description: "",
      manufacturer: "",
      model: "",
      category: "",
      unit: "",
      lastCost: "",
      leadTimeDays: "",
      finish: "",
      minOrderQty: "1",
      substitutable: true,
    },
  });

  const createMaterial = useMutation({
    mutationFn: async (data: MaterialFormData) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Convert string values to proper types
      const materialData: InsertMaterial = {
        organizationId: currentOrganization.id,
        sku: data.sku,
        description: data.description,
        manufacturer: data.manufacturer || null,
        model: data.model || null,
        unit: data.unit,
        category: data.category || null,
        finish: data.finish || null,
        lastCost: parseFloat(data.lastCost),
        leadTimeDays: parseInt(data.leadTimeDays),
        minOrderQty: parseInt(data.minOrderQty || "1"),
        substitutable: data.substitutable,
      };

      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(materialData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create material');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Material created",
        description: "The material has been added to your catalog.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
      navigate('/materials');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MaterialFormData) => {
    createMaterial.mutate(data);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/materials')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Material</h1>
          <p className="text-muted-foreground">Create a new material entry for your catalog</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Material Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., TLE-001-CHR"
                          data-testid="input-sku"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., American Standard"
                          data-testid="input-manufacturer"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detailed material description..."
                        data-testid="input-description"
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Model number"
                          data-testid="input-model"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
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
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-unit">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pricing & Logistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="lastCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Cost ($) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          data-testid="input-cost"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leadTimeDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Time (days) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="7"
                          data-testid="input-lead-time"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minOrderQty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Order Qty</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="1"
                          data-testid="input-min-order"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Details */}
              <FormField
                control={form.control}
                name="finish"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Finish/Color</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Polished Chrome, Satin Nickel"
                        data-testid="input-finish"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Checkboxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="substitutable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-substitutions"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Allow Substitutions</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Alternative products acceptable
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/materials')}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMaterial.isPending}
                  data-testid="button-save"
                >
                  {createMaterial.isPending ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Material
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}