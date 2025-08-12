import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Plus, 
  Building, 
  MapPin, 
  DollarSign, 
  Calendar,
  X,
  Save
} from "lucide-react";

const costCodeSchema = z.object({
  scope: z.string().min(1, "Scope is required"),
  code: z.string().min(1, "Cost code is required"),
  budget: z.string().min(1, "Budget is required"),
});

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  client: z.string().min(1, "Client is required"),
  address: z.string().min(1, "Address is required"),
  budget: z.string().min(1, "Budget is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  description: z.string().optional(),
  costCodes: z.array(costCodeSchema).optional(),
  status: z.enum(["active", "on_hold", "completed", "cancelled"]),
});

type ProjectFormData = z.infer<typeof projectSchema>;
type CostCode = z.infer<typeof costCodeSchema>;

export default function NewProject() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [costCodeForm, setCostCodeForm] = useState<CostCode>({
    scope: "",
    code: "",
    budget: "",
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      client: "",
      address: "",
      budget: "",
      startDate: "",
      endDate: "",
      description: "",
      costCodes: [],
      status: "active",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      // Only send fields that match the database schema
      const projectData = {
        name: data.name,
        client: data.client || null,
        address: data.address || null,
        status: data.status,
        budget: data.budget ? parseFloat(data.budget).toString() : null,
        costCodes: data.costCodes?.map(cc => `${cc.scope} - ${cc.code}`) || [],
        erpIds: null, // Can be set later when ERP integration is implemented
      };
      
      console.log('Sending project data:', projectData);
      return apiRequest('POST', '/api/projects', projectData);
    },
    onSuccess: () => {
      toast({
        title: "Project Created",
        description: "Your project has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      navigate("/projects");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Project",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  const addCostCode = () => {
    if (costCodeForm.scope.trim() && costCodeForm.code.trim() && costCodeForm.budget.trim()) {
      const currentCodes = form.getValues("costCodes") || [];
      const newCode = { ...costCodeForm };
      
      // Check if cost code already exists
      const exists = currentCodes.some(cc => cc.code === newCode.code);
      if (!exists) {
        form.setValue("costCodes", [...currentCodes, newCode]);
        setCostCodeForm({ scope: "", code: "", budget: "" });
      }
    }
  };

  const removeCostCode = (indexToRemove: number) => {
    const currentCodes = form.getValues("costCodes") || [];
    form.setValue("costCodes", currentCodes.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/projects")}
          data-testid="button-back-to-projects"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create New Project</h1>
          <p className="text-muted-foreground">Set up a new construction project with budget tracking</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  {...form.register("name")}
                  id="name"
                  placeholder="Metro Plaza Office Tower"
                  data-testid="input-project-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Client *</Label>
                <Input
                  {...form.register("client")}
                  id="client"
                  placeholder="Metro Construction Corp"
                  data-testid="input-client"
                />
                {form.formState.errors.client && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.client.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Project Address *</Label>
                <Textarea
                  {...form.register("address")}
                  id="address"
                  placeholder="123 Main Street, Anytown, ST 12345"
                  data-testid="input-address"
                />
                {form.formState.errors.address && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.address.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Project Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value: "active" | "on_hold" | "completed" | "cancelled") => 
                    form.setValue("status", value)
                  }
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  {...form.register("description")}
                  id="description"
                  placeholder="Project description and notes..."
                  data-testid="input-description"
                />
              </div>
            </CardContent>
          </Card>

          {/* Budget & Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Budget & Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Total Budget *</Label>
                <Input
                  {...form.register("budget")}
                  id="budget"
                  type="number"
                  step="0.01"
                  placeholder="500000.00"
                  data-testid="input-budget"
                />
                {form.formState.errors.budget && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.budget.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    {...form.register("startDate")}
                    id="startDate"
                    type="date"
                    data-testid="input-start-date"
                  />
                  {form.formState.errors.startDate && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.startDate.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    {...form.register("endDate")}
                    id="endDate"
                    type="date"
                    data-testid="input-end-date"
                  />
                  {form.formState.errors.endDate && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.endDate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Cost Codes */}
              <div className="space-y-3">
                <Label>Cost Codes</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Input
                      value={costCodeForm.scope}
                      onChange={(e) => setCostCodeForm(prev => ({ ...prev, scope: e.target.value }))}
                      placeholder="Scope (e.g., Concrete Work)"
                      data-testid="input-cost-code-scope"
                    />
                  </div>
                  <div>
                    <Input
                      value={costCodeForm.code}
                      onChange={(e) => setCostCodeForm(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="Cost Code (e.g., 23479024-102800-71130)"
                      data-testid="input-cost-code-code"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={costCodeForm.budget}
                      onChange={(e) => setCostCodeForm(prev => ({ ...prev, budget: e.target.value }))}
                      type="number"
                      step="0.01"
                      placeholder="Budget ($)"
                      data-testid="input-cost-code-budget"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCostCode}
                      disabled={!costCodeForm.scope.trim() || !costCodeForm.code.trim() || !costCodeForm.budget.trim()}
                      data-testid="button-add-cost-code"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Display Cost Codes */}
                {form.watch("costCodes") && form.watch("costCodes")!.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <Label className="text-sm text-muted-foreground">Added Cost Codes:</Label>
                    <div className="space-y-2">
                      {form.watch("costCodes")!.map((costCode, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                          data-testid={`cost-code-item-${index}`}
                        >
                          <div className="flex-1">
                            <div className="font-medium">{costCode.scope}</div>
                            <div className="text-sm text-muted-foreground">{costCode.code}</div>
                            <div className="text-sm font-medium text-green-600 dark:text-green-400">
                              ${parseFloat(costCode.budget).toLocaleString()}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCostCode(index)}
                            data-testid={`button-remove-cost-code-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6">
          <Button
            type="submit"
            disabled={createProjectMutation.isPending}
            className="flex-1"
            data-testid="button-create-project"
          >
            {createProjectMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Project
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/projects")}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}