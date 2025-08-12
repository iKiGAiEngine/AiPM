import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Building,
  DollarSign,
  Calendar,
  Tag,
  Plus,
  X,
  Save,
  ArrowRight
} from "lucide-react";

const costCodeSchema = z.object({
  scope: z.string().min(1, "Scope is required"),
  projectNumber: z.string().min(1, "Project number is required"),
  phaseCode: z.string().min(1, "Phase code is required"),
  standardCode: z.string().min(1, "Standard code is required"),
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
  const [currentStep, setCurrentStep] = useState<'info' | 'budget'>('info');
  const [costCodeForm, setCostCodeForm] = useState<CostCode>({
    scope: "",
    projectNumber: "",
    phaseCode: "",
    standardCode: "71130",
    budget: "",
  });

  // Phase code options with auto-population for scope
  const phaseCodeOptions = [
    { value: "102800", label: "102800 - Toilet Accessories" },
    { value: "104400", label: "104400 - Fire Extinguishers" },
    { value: "033000", label: "033000 - Cast-in-Place Concrete" },
    { value: "055000", label: "055000 - Metal Fabrications" },
    { value: "061000", label: "061000 - Rough Carpentry" },
    { value: "072100", label: "072100 - Thermal Insulation" },
    { value: "092900", label: "092900 - Gypsum Board" },
    { value: "099100", label: "099100 - Painting" },
  ];

  const getScopeFromPhaseCode = (phaseCode: string) => {
    const option = phaseCodeOptions.find(opt => opt.value === phaseCode);
    return option ? option.label.split(" - ")[1] : "";
  };

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
      const payload = {
        name: data.name,
        client: data.client || null,
        address: data.address || null,
        status: data.status,
        budget: data.budget ? parseFloat(data.budget).toString() : null,
        costCodes: data.costCodes?.map(cc => `${cc.scope} - ${cc.projectNumber}-${cc.phaseCode}-${cc.standardCode}`) || [],
        erpIds: null,
      };
      
      return apiRequest("/api/projects", {
        method: "POST",
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project Created",
        description: "Your new project has been created successfully.",
      });
      navigate("/projects");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    if (currentStep === 'info') {
      // Validate project info fields before proceeding
      const hasErrors = form.formState.errors.name || form.formState.errors.client || form.formState.errors.address || form.formState.errors.budget || form.formState.errors.startDate || form.formState.errors.endDate;
      if (!hasErrors) {
        setCurrentStep('budget');
      }
    } else {
      createProjectMutation.mutate(data);
    }
  };

  const addCostCode = () => {
    if (costCodeForm.scope.trim() && costCodeForm.projectNumber.trim() && costCodeForm.phaseCode.trim() && costCodeForm.standardCode.trim() && costCodeForm.budget.trim()) {
      const currentCodes = form.getValues("costCodes") || [];
      const newCode = { ...costCodeForm };
      
      const fullCode = `${newCode.projectNumber}-${newCode.phaseCode}-${newCode.standardCode}`;
      const exists = currentCodes.some(cc => `${cc.projectNumber}-${cc.phaseCode}-${cc.standardCode}` === fullCode);
      if (!exists) {
        form.setValue("costCodes", [...currentCodes, newCode]);
        setCostCodeForm({ 
          scope: "", 
          projectNumber: "", 
          phaseCode: "", 
          standardCode: "71130", 
          budget: "" 
        });
      }
    }
  };

  // Calculate budget totals
  const totalContractValue = parseFloat(form.watch("budget") || "0");
  const allocatedBudget = (form.watch("costCodes") || []).reduce((sum, cc) => sum + parseFloat(cc.budget || "0"), 0);
  const remainingBudget = totalContractValue - allocatedBudget;

  const removeCostCode = (indexToRemove: number) => {
    const currentCodes = form.getValues("costCodes") || [];
    form.setValue("costCodes", currentCodes.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="p-4 sm:p-6 min-h-screen flex flex-col max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => currentStep === 'info' ? navigate("/projects") : setCurrentStep('info')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 'info' ? 'Back to Projects' : 'Back'}
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {currentStep === 'info' ? 'Project Information' : 'Budget & Cost Codes'}
          </h1>
          <p className="text-muted-foreground">
            {currentStep === 'info' 
              ? 'Enter basic project details and contract information' 
              : 'Configure cost codes and budget allocation'
            }
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center space-x-4 mb-8">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'info' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
          }`}>
            1
          </div>
          <span className={`text-sm font-medium ${currentStep === 'info' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Project Information
          </span>
        </div>
        <div className="flex-1 h-0.5 bg-muted"></div>
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'budget' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}>
            2
          </div>
          <span className={`text-sm font-medium ${currentStep === 'budget' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Budget & Cost Codes
          </span>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
        <div className="flex-1">
          {currentStep === 'info' ? (
            // Project Information Step
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Building className="w-6 h-6" />
                  Basic Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name *</Label>
                    <Input
                      {...form.register("name")}
                      id="name"
                      placeholder="Downtown Office Complex"
                      className="h-12 text-base"
                      data-testid="input-name"
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
                      placeholder="ABC Construction Company"
                      className="h-12 text-base"
                      data-testid="input-client"
                    />
                    {form.formState.errors.client && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.client.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Project Address *</Label>
                  <Input
                    {...form.register("address")}
                    id="address"
                    placeholder="123 Main Street, City, State, ZIP"
                    className="h-12 text-base"
                    data-testid="input-address"
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.address.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Total Contract Value *</Label>
                  <Input
                    {...form.register("budget")}
                    id="budget"
                    type="number"
                    step="0.01"
                    placeholder="500000.00"
                    className="h-12 text-base"
                    data-testid="input-budget"
                  />
                  {form.formState.errors.budget && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.budget.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      {...form.register("startDate")}
                      id="startDate"
                      type="date"
                      className="h-12 text-base"
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
                      className="h-12 text-base"
                      data-testid="input-end-date"
                    />
                    {form.formState.errors.endDate && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.endDate.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Project Status</Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(value: any) => form.setValue("status", value)}
                  >
                    <SelectTrigger className="h-12" data-testid="select-status">
                      <SelectValue placeholder="Select status" />
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
                    className="min-h-24"
                    data-testid="input-description"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            // Budget & Cost Codes Step
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Tag className="w-6 h-6" />
                  Cost Codes & Budget Allocation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Budget Summary */}
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-3">Budget Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Contract Value</div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        ${totalContractValue.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Allocated Budget</div>
                      <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                        ${allocatedBudget.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Remaining Budget</div>
                      <div className={`text-xl font-bold ${remainingBudget === 0 ? 'text-green-600 dark:text-green-400' : remainingBudget < 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        ${remainingBudget.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {remainingBudget === 0 && (
                    <div className="mt-2 text-center text-sm text-green-600 dark:text-green-400 font-medium">
                      ✓ Budget is fully allocated and balanced
                    </div>
                  )}
                  {remainingBudget < 0 && (
                    <div className="mt-2 text-center text-sm text-red-600 dark:text-red-400 font-medium">
                      ⚠ Budget is over-allocated by ${Math.abs(remainingBudget).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Add Cost Codes</Label>
                  <div className="space-y-4">
                    {/* Scope Field */}
                    <div className="space-y-2">
                      <Label>Scope (Work Description)</Label>
                      <Input
                        value={costCodeForm.scope}
                        onChange={(e) => setCostCodeForm(prev => ({ ...prev, scope: e.target.value }))}
                        placeholder="e.g., Toilet Accessories, Fire Extinguishers, Cast-in-Place Concrete"
                        className="h-12 text-base"
                        data-testid="input-cost-code-scope"
                      />
                    </div>
                    
                    {/* Cost Code Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Project Number</Label>
                        <Input
                          value={costCodeForm.projectNumber}
                          onChange={(e) => setCostCodeForm(prev => ({ ...prev, projectNumber: e.target.value }))}
                          placeholder="e.g., 23479024"
                          className="h-12 text-base font-mono"
                          data-testid="input-project-number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phase Code</Label>
                        <Select
                          value={costCodeForm.phaseCode}
                          onValueChange={(value) => {
                            setCostCodeForm(prev => ({ 
                              ...prev, 
                              phaseCode: value,
                              scope: getScopeFromPhaseCode(value) || prev.scope
                            }));
                          }}
                        >
                          <SelectTrigger className="h-12" data-testid="select-phase-code">
                            <SelectValue placeholder="Select phase code" />
                          </SelectTrigger>
                          <SelectContent>
                            {phaseCodeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Standard Code</Label>
                        <Input
                          value={costCodeForm.standardCode}
                          onChange={(e) => setCostCodeForm(prev => ({ ...prev, standardCode: e.target.value }))}
                          placeholder="71130"
                          className="h-12 text-base font-mono"
                          data-testid="input-standard-code"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Budget ($)</Label>
                        <Input
                          value={costCodeForm.budget}
                          onChange={(e) => setCostCodeForm(prev => ({ ...prev, budget: e.target.value }))}
                          type="number"
                          step="0.01"
                          placeholder="50000.00"
                          className="h-12 text-base"
                          data-testid="input-cost-code-budget"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-start">
                      <Button
                        type="button"
                        onClick={addCostCode}
                        disabled={!costCodeForm.scope.trim() || !costCodeForm.projectNumber.trim() || !costCodeForm.phaseCode.trim() || !costCodeForm.standardCode.trim() || !costCodeForm.budget.trim()}
                        className="h-12 px-6"
                        data-testid="button-add-cost-code"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Cost Code
                      </Button>
                    </div>
                  </div>
                  
                  {/* Display Cost Codes */}
                  {form.watch("costCodes") && form.watch("costCodes")!.length > 0 && (
                    <div className="space-y-4 mt-6">
                      <Label className="text-lg font-semibold">Added Cost Codes</Label>
                      <div className="space-y-3">
                        {form.watch("costCodes")!.map((costCode, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
                            data-testid={`cost-code-item-${index}`}
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-lg">{costCode.scope}</div>
                              <div className="text-sm text-muted-foreground font-mono">
                                {costCode.projectNumber}-{costCode.phaseCode}-{costCode.standardCode}
                              </div>
                              <div className="text-base font-semibold text-green-600 dark:text-green-400">
                                ${parseFloat(costCode.budget).toLocaleString()}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
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
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6 mt-auto">
          {currentStep === 'info' ? (
            <Button
              type="submit"
              className="flex-1 h-12 text-base"
              data-testid="button-next"
            >
              Next: Budget & Cost Codes
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={createProjectMutation.isPending}
              className="flex-1 h-12 text-base"
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
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => currentStep === 'info' ? navigate("/projects") : setCurrentStep('info')}
            className="h-12 text-base"
            data-testid="button-cancel"
          >
            {currentStep === 'info' ? 'Cancel' : 'Back'}
          </Button>
        </div>
      </form>
    </div>
  );
}