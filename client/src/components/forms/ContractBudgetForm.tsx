import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContractEstimate } from "@shared/schema";

const contractBudgetSchema = z.object({
  estimateNumber: z.string().min(1, "Estimate number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  costCode: z.string().min(1, "Cost code is required"),
  awardedValue: z.string().min(1, "Awarded value is required"),
  estimatedQuantity: z.string().optional(),
  unit: z.string().optional(),
  materialCategory: z.string().optional(),
  awardDate: z.string().optional(),
});

type ContractBudgetForm = z.infer<typeof contractBudgetSchema>;

interface ContractBudgetFormProps {
  projectId: string;
  budget?: ContractEstimate;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ContractBudgetForm({ projectId, budget, onSuccess, onCancel }: ContractBudgetFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<ContractBudgetForm>({
    resolver: zodResolver(contractBudgetSchema),
    defaultValues: {
      estimateNumber: budget?.estimateNumber || "",
      title: budget?.title || "",
      description: budget?.description || "",
      costCode: budget?.costCode || "",
      awardedValue: budget?.awardedValue?.toString() || "",
      estimatedQuantity: budget?.estimatedQuantity?.toString() || "",
      unit: budget?.unit || "",
      materialCategory: budget?.materialCategory || "",
      awardDate: budget?.awardDate ? new Date(budget.awardDate).toISOString().split('T')[0] : "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ContractBudgetForm) => {
      const payload = {
        ...data,
        awardedValue: parseFloat(data.awardedValue),
        estimatedQuantity: data.estimatedQuantity ? parseFloat(data.estimatedQuantity) : null,
        awardDate: data.awardDate ? new Date(data.awardDate) : null,
      };
      return apiRequest(`/api/projects/${projectId}/contract-budgets`, "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "contract-budgets"] });
      toast({ title: "Contract budget created successfully" });
      onSuccess?.();
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create contract budget", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ContractBudgetForm) => {
      const payload = {
        ...data,
        awardedValue: parseFloat(data.awardedValue),
        estimatedQuantity: data.estimatedQuantity ? parseFloat(data.estimatedQuantity) : null,
        awardDate: data.awardDate ? new Date(data.awardDate) : null,
      };
      return apiRequest(`/api/contract-budgets/${budget!.id}`, "PUT", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "contract-budgets"] });
      toast({ title: "Contract budget updated successfully" });
      onSuccess?.();
    },
    onError: (error) => {
      toast({ 
        title: "Failed to update contract budget", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: ContractBudgetForm) => {
    if (budget) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-contract-budget">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="estimateNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimate Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="EST-001" 
                    {...field} 
                    data-testid="input-estimate-number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="costCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Code</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="02-Site Work" 
                    {...field} 
                    data-testid="input-cost-code"
                  />
                </FormControl>
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
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Site Preparation & Excavation" 
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
                  placeholder="Detailed description of work scope..." 
                  {...field} 
                  data-testid="textarea-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="awardedValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Awarded Value ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="125000.00" 
                    {...field} 
                    data-testid="input-awarded-value"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estimatedQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="1500" 
                    {...field} 
                    data-testid="input-quantity"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-unit">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CY">Cubic Yards (CY)</SelectItem>
                      <SelectItem value="SF">Square Feet (SF)</SelectItem>
                      <SelectItem value="LF">Linear Feet (LF)</SelectItem>
                      <SelectItem value="TON">Tons (TON)</SelectItem>
                      <SelectItem value="LS">Lump Sum (LS)</SelectItem>
                      <SelectItem value="EA">Each (EA)</SelectItem>
                      <SelectItem value="HR">Hours (HR)</SelectItem>
                      <SelectItem value="LB">Pounds (LB)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="materialCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Material Category</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Site Work">Site Work</SelectItem>
                      <SelectItem value="Concrete">Concrete</SelectItem>
                      <SelectItem value="Structural Steel">Structural Steel</SelectItem>
                      <SelectItem value="Wood & Plastics">Wood & Plastics</SelectItem>
                      <SelectItem value="HVAC">HVAC</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                      <SelectItem value="Plumbing">Plumbing</SelectItem>
                      <SelectItem value="Masonry">Masonry</SelectItem>
                      <SelectItem value="Finishes">Finishes</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="awardDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Award Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field} 
                    data-testid="input-award-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-4 pt-4">
          <Button 
            type="submit" 
            disabled={isLoading}
            data-testid="button-save-budget"
          >
            {isLoading ? "Saving..." : budget ? "Update Budget" : "Create Budget"}
          </Button>
          
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              data-testid="button-cancel-budget"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}