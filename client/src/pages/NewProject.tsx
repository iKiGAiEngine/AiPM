import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Edit,
  Save,
  ArrowRight,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { ProjectMaterialsStep } from "@/components/forms/ProjectMaterialsStep";

const costCodeSchema = z.object({
  scope: z.string().min(1, "Scope is required"),
  projectNumber: z.string().min(1, "Project number is required"),
  phaseCode: z.string().min(1, "Phase code is required"),
  standardCode: z.string().min(1, "Standard code is required"),
  budget: z.string().min(1, "Budget is required"),
});

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  projectNumber: z.string().min(1, "Project number is required"),
  client: z.string().min(1, "Client is required"),
  address: z.string().min(1, "Address is required"),
  budget: z.string().min(1, "Cost Budget is required"), // Cost Budget
  overheadFee: z.string().min(1, "Overhead/Fee is required"), // Overhead/Fee
  contractValue: z.string().min(1, "Contract Value is required"), // Total Contract Value
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  description: z.string().optional(),
  costCodes: z.array(costCodeSchema).optional(),
  status: z.enum(["active", "on_hold", "completed", "cancelled"]),
}).refine((data) => {
  const costBudget = parseFloat(data.budget) || 0;
  const overheadFee = parseFloat(data.overheadFee) || 0;
  const contractValue = parseFloat(data.contractValue) || 0;
  return Math.abs((costBudget + overheadFee) - contractValue) < 0.01;
}, {
  message: "Cost Budget + Overhead/Fee must equal Contract Value",
  path: ["contractValue"],
});

type ProjectFormData = z.infer<typeof projectSchema>;
type CostCode = z.infer<typeof costCodeSchema>;

export default function NewProject() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<'info' | 'budget' | 'materials'>('info');
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [costCodeForm, setCostCodeForm] = useState<CostCode>({
    scope: "",
    projectNumber: "",
    phaseCode: "",
    standardCode: "71130",
    budget: "",
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [sessionProjectNumber, setSessionProjectNumber] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');

  // Keyboard navigation helper
  const handleEnterKeyNavigation = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextFieldId) {
        const nextField = document.getElementById(nextFieldId);
        if (nextField) {
          nextField.focus();
        }
      } else {
        // Move to next focusable element
        const focusableElements = document.querySelectorAll(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        );
        const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as Element);
        if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
          (focusableElements[currentIndex + 1] as HTMLElement).focus();
        }
      }
    }
  };



  // Division 10 Equipment phase codes (condensed for better visibility)
  const phaseCodeOptions = [
    { value: "102800", label: "102800 - Toilet Accessories" },
    { value: "104416", label: "104416 - Fire Extinguishers" },
    { value: "105113", label: "105113 - Metal Lockers" },
    { value: "102113", label: "102113 - Metal Toilet Compartments" },
    { value: "104413", label: "104413 - Fire Extinguisher Cabinets" },
    { value: "108300", label: "108300 - Mirrors" },
    { value: "101100", label: "101100 - Chalkboards" },
    { value: "101200", label: "101200 - Marker Boards" },
    { value: "101400", label: "101400 - Bulletin Boards" },
    { value: "103100", label: "103100 - Manufactured Fireplaces" },
    { value: "105500", label: "105500 - Postal Specialties" },
    { value: "106000", label: "106000 - Service Wall Systems" },
    { value: "107100", label: "107100 - Exterior Sun Control" },
    { value: "108113", label: "108113 - Metal Flagpoles" },
  ];

  const getScopeFromPhaseCode = (phaseCode: string) => {
    const option = phaseCodeOptions.find(opt => opt.value === phaseCode);
    return option ? option.label.split(" - ")[1] : "";
  };

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      projectNumber: "",
      client: "",
      address: "",
      budget: "", // Cost Budget
      overheadFee: "", // Overhead/Fee
      contractValue: "", // Total Contract Value
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
        projectNumber: data.projectNumber || null,
        client: data.client || null,
        address: data.address || null,
        status: data.status,
        budget: data.budget || null, // Cost Budget
        overheadFee: data.overheadFee || null, // Overhead/Fee
        contractValue: data.contractValue || null, // Total Contract Value
        costCodes: data.costCodes?.map(cc => `${cc.scope} - ${cc.projectNumber}-${cc.phaseCode}-${cc.standardCode}`) || [],
        erpIds: null,
      };
      
      console.log('Sending project payload:', payload);
      const response = await apiRequest("POST", "/api/projects", payload);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Project creation error:', errorText);
        throw new Error(errorText);
      }
      return response.json();
    },
    onSuccess: (data) => {
      setCreatedProjectId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project Created",
        description: "Project created successfully. Now add materials to complete setup.",
      });
      // Move to materials step after project creation if coming from budget step
      if (currentStep === 'budget') {
        setCurrentStep('materials');
      }
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
      const hasErrors = form.formState.errors.name || form.formState.errors.projectNumber || form.formState.errors.client || form.formState.errors.address || form.formState.errors.budget || form.formState.errors.startDate || form.formState.errors.endDate;
      if (!hasErrors) {
        // Set session project number and initialize cost code form
        if (data.projectNumber && !sessionProjectNumber) {
          setSessionProjectNumber(data.projectNumber);
          setCostCodeForm(prev => ({ ...prev, projectNumber: data.projectNumber }));
        }
        setCurrentStep('budget');
      }
    } else if (currentStep === 'budget') {
      // Create project when moving to materials step so we have a projectId
      createProjectMutation.mutate(data);
    } else {
      // Final step - navigate to projects list
      navigate("/projects");
    }
  };

  const addCostCode = () => {
    const projectNumber = form.watch("projectNumber") || sessionProjectNumber;
    if (costCodeForm.scope.trim() && projectNumber && costCodeForm.phaseCode.trim() && costCodeForm.standardCode.trim() && costCodeForm.budget.trim()) {
      const currentCodes = form.getValues("costCodes") || [];
      const newCode = { ...costCodeForm };
      
      // Use the project number from the form
      newCode.projectNumber = projectNumber;
      
      if (editingIndex !== null) {
        // Update existing cost code
        const updatedCodes = [...currentCodes];
        updatedCodes[editingIndex] = newCode;
        form.setValue("costCodes", updatedCodes);
        setEditingIndex(null);
      } else {
        // Add new cost code
        const fullCode = `${newCode.projectNumber}-${newCode.phaseCode}-${newCode.standardCode}`;
        const exists = currentCodes.some(cc => `${cc.projectNumber}-${cc.phaseCode}-${cc.standardCode}` === fullCode);
        if (!exists) {
          form.setValue("costCodes", [...currentCodes, newCode]);
        }
      }
      
      setCostCodeForm({ 
        scope: "", 
        projectNumber: projectNumber, 
        phaseCode: "", 
        standardCode: "71130", 
        budget: "" 
      });
    }
  };

  const editCostCode = (index: number) => {
    const costCode = form.getValues("costCodes")?.[index];
    if (costCode) {
      setCostCodeForm(costCode);
      setEditingIndex(index);
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    const projectNumber = form.watch("projectNumber") || sessionProjectNumber;
    setCostCodeForm({ 
      scope: "", 
      projectNumber: projectNumber, 
      phaseCode: "", 
      standardCode: "71130", 
      budget: "" 
    });
  };

  // Format currency input with commas
  const formatCurrency = (value: string) => {
    const num = parseFloat(value || "0");
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
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
          onClick={() => {
            if (currentStep === 'info') {
              navigate("/projects");
            } else if (currentStep === 'budget') {
              setCurrentStep('info');
            } else if (currentStep === 'materials') {
              setCurrentStep('budget');
            }
          }}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 'info' ? 'Back to Projects' : 'Back'}
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {currentStep === 'info' ? 'Project Information' : 
             currentStep === 'budget' ? 'Budget & Cost Codes' : 'Project Materials'}
          </h1>
          <p className="text-muted-foreground">
            {currentStep === 'info' ? 'Enter basic project details and contract information' : 
             currentStep === 'budget' ? 'Configure cost codes and budget allocation' :
             'Import or add materials for your project'
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
              : currentStep === 'materials'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                : 'bg-muted text-muted-foreground'
          }`}>
            2
          </div>
          <span className={`text-sm font-medium ${currentStep === 'budget' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Budget & Cost Codes
          </span>
        </div>
        <div className="flex-1 h-0.5 bg-muted"></div>
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'materials' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}>
            3
          </div>
          <span className={`text-sm font-medium ${currentStep === 'materials' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Materials
          </span>
        </div>
      </div>

      {currentStep === 'materials' ? (
        <ProjectMaterialsStep 
          projectId={createdProjectId!} 
          onNext={() => navigate("/projects")}
          onPrevious={() => setCurrentStep('budget')}
        />
      ) : (
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className="flex-1 flex flex-col"
          onKeyDown={(e) => {
            // Prevent Enter key from submitting the form except when explicitly intended
            if (e.key === 'Enter' && e.target instanceof HTMLElement) {
              const isButton = e.target.tagName === 'BUTTON';
              const isSubmitButton = e.target.getAttribute('type') === 'submit';
              const isTextarea = e.target.tagName === 'TEXTAREA';
              
              if (!isButton && !isSubmitButton && !isTextarea) {
                // Let handleEnterKeyNavigation handle the navigation
                return;
              } else if (isTextarea && !e.ctrlKey && !e.metaKey) {
                // Allow normal Enter in textarea, unless Ctrl/Cmd+Enter
                return;
              }
            }
          }}
        >
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
                      className="h-12 text-base bg-slate-900 text-slate-100 placeholder-slate-400 border-slate-700 focus:border-slate-500 focus:ring-0"
                      data-testid="input-name"
                      onKeyDown={(e) => handleEnterKeyNavigation(e, "client")}
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
                      className="h-12 text-base bg-slate-900 text-slate-100 placeholder-slate-400 border-slate-700 focus:border-slate-500 focus:ring-0"
                      data-testid="input-client"
                      onKeyDown={(e) => handleEnterKeyNavigation(e, "projectNumber")}
                    />
                    {form.formState.errors.client && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.client.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectNumber">Project Number *</Label>
                  <Input
                    {...form.register("projectNumber")}
                    id="projectNumber"
                    placeholder="e.g., 23479024"
                    className="h-12 text-base bg-slate-900 text-slate-100 placeholder-slate-400 border-slate-700 focus:border-slate-500 focus:ring-0"
                    data-testid="input-project-number-main"
                    onKeyDown={(e) => handleEnterKeyNavigation(e, "address")}
                  />
                  {form.formState.errors.projectNumber && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.projectNumber.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Project Address *</Label>
                  <Input
                    {...form.register("address")}
                    id="address"
                    placeholder="123 Main Street, City, State, ZIP"
                    className="h-12 text-base bg-slate-900 text-slate-100 placeholder-slate-400 border-slate-700 focus:border-slate-500 focus:ring-0"
                    data-testid="input-address"
                    onKeyDown={(e) => handleEnterKeyNavigation(e, "budget")}
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.address.message}
                    </p>
                  )}
                </div>

                {/* Budget Structure */}
                <div className="space-y-4 p-4 border rounded-lg bg-slate-800/50 border-slate-600">
                  <h3 className="text-lg font-semibold text-slate-100">Budget Breakdown</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Cost Budget */}
                    <div className="space-y-2">
                      <Label htmlFor="budget">Cost Budget *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-100 text-base font-medium z-10">$</span>
                        <CurrencyInput
                          id="budget"
                          value={form.watch("budget") || ""}
                          onChange={(value) => {
                            form.setValue("budget", value);
                            form.trigger("budget");
                            // Auto-calculate contract value if overhead/fee is set
                            const overhead = parseFloat(form.watch("overheadFee") || "0");
                            const cost = parseFloat(value || "0");
                            if (overhead > 0 || cost > 0) {
                              form.setValue("contractValue", (cost + overhead).toString());
                              form.trigger("contractValue");
                            }
                          }}
                          placeholder="400,000.00"
                          className="h-12 text-base pl-8 bg-slate-900 text-slate-100 placeholder-slate-400 border-slate-700 focus:border-slate-500 focus:ring-0"
                          data-testid="input-cost-budget"
                        />
                      </div>
                      {form.formState.errors.budget && (
                        <p className="text-sm text-destructive">{form.formState.errors.budget.message}</p>
                      )}
                    </div>

                    {/* Overhead/Fee */}
                    <div className="space-y-2">
                      <Label htmlFor="overheadFee">Overhead/Fee *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-100 text-base font-medium z-10">$</span>
                        <CurrencyInput
                          id="overheadFee"
                          value={form.watch("overheadFee") || ""}
                          onChange={(value) => {
                            form.setValue("overheadFee", value);
                            form.trigger("overheadFee");
                            // Auto-calculate contract value
                            const cost = parseFloat(form.watch("budget") || "0");
                            const overhead = parseFloat(value || "0");
                            if (cost > 0 || overhead > 0) {
                              form.setValue("contractValue", (cost + overhead).toString());
                              form.trigger("contractValue");
                            }
                          }}
                          placeholder="100,000.00"
                          className="h-12 text-base pl-8 bg-slate-900 text-slate-100 placeholder-slate-400 border-slate-700 focus:border-slate-500 focus:ring-0"
                          data-testid="input-overhead-fee"
                        />
                      </div>
                      {form.formState.errors.overheadFee && (
                        <p className="text-sm text-destructive">{form.formState.errors.overheadFee.message}</p>
                      )}
                    </div>

                    {/* Total Contract Value */}
                    <div className="space-y-2">
                      <Label htmlFor="contractValue">Total Contract Value *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-100 text-base font-medium z-10">$</span>
                        <CurrencyInput
                          id="contractValue"
                          value={form.watch("contractValue") || ""}
                          onChange={(value) => {
                            form.setValue("contractValue", value);
                            form.trigger("contractValue");
                          }}
                          placeholder="500,000.00"
                          className="h-12 text-base pl-8 bg-slate-900 text-slate-100 placeholder-slate-400 border-slate-700 focus:border-slate-500 focus:ring-0"
                          data-testid="input-contract-value"
                        />
                      </div>
                      {form.formState.errors.contractValue && (
                        <p className="text-sm text-destructive">{form.formState.errors.contractValue.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Budget Validation Status */}
                  {(form.watch("budget") || form.watch("overheadFee") || form.watch("contractValue")) && (
                    <div className="mt-4 p-3 rounded-lg bg-slate-700/50">
                      {(() => {
                        const costBudget = parseFloat(form.watch("budget") || "0");
                        const overheadFee = parseFloat(form.watch("overheadFee") || "0");
                        const contractValue = parseFloat(form.watch("contractValue") || "0");
                        const calculatedTotal = costBudget + overheadFee;
                        const isBalanced = Math.abs(calculatedTotal - contractValue) < 0.01;
                        
                        return (
                          <div className={`flex items-center gap-2 ${isBalanced ? 'text-green-400' : 'text-red-400'}`}>
                            {isBalanced ? (
                              <>
                                <CheckCircle className="w-5 h-5" />
                                <span>Budget is balanced: ${calculatedTotal.toLocaleString()} = ${contractValue.toLocaleString()}</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-5 h-5" />
                                <span>Budget mismatch: ${calculatedTotal.toLocaleString()} ≠ ${contractValue.toLocaleString()} (Difference: ${Math.abs(calculatedTotal - contractValue).toLocaleString()})</span>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <div className="relative">
                      <Input
                        {...form.register("startDate")}
                        id="startDate"
                        type="date"
                        className="h-12 text-base bg-slate-900 text-slate-100 placeholder-slate-400 border-slate-700 focus:border-slate-500 focus:ring-0"
                        data-testid="input-start-date"
                        onKeyDown={(e) => handleEnterKeyNavigation(e, "endDate")}
                      />
                    </div>
                    {form.formState.errors.startDate && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.startDate.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <div className="relative">
                      <Input
                        {...form.register("endDate")}
                        id="endDate"
                        type="date"
                        className="h-12 text-base bg-slate-900 text-slate-100 placeholder-slate-400 border-slate-700 focus:border-slate-500 focus:ring-0"
                        data-testid="input-end-date"
                        onKeyDown={(e) => handleEnterKeyNavigation(e)}
                      />
                    </div>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleEnterKeyNavigation(e);
                      }
                    }}
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
                      <div className="text-sm text-muted-foreground">Budget Allocated</div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        ${allocatedBudget.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Remaining Budget</div>
                      <div className={`text-xl font-bold ${remainingBudget >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${remainingBudget.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Code Form */}
                <div className="bg-muted/30 p-6 rounded-lg border space-y-4">
                  <h4 className="font-medium text-lg">Add Cost Code</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phaseCode">Phase Code *</Label>
                      <Select
                        value={costCodeForm.phaseCode}
                        onValueChange={(value) => {
                          setCostCodeForm({ ...costCodeForm, phaseCode: value, scope: getScopeFromPhaseCode(value) });
                        }}
                      >
                        <SelectTrigger data-testid="select-phase-code">
                          <SelectValue placeholder="Select phase" />
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
                      <Label htmlFor="costBudget">Budget Amount *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground text-base font-medium z-10">
                          $
                        </span>
                        <CurrencyInput
                          id="costBudget"
                          value={costCodeForm.budget}
                          onChange={(value) => setCostCodeForm({ ...costCodeForm, budget: value })}
                          placeholder="25,000.00"
                          className="pl-8"
                          data-testid="input-cost-budget"

                        />
                      </div>
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={addCostCode}
                        disabled={!costCodeForm.phaseCode || !costCodeForm.budget}
                        className="w-full"
                        data-testid="button-add-cost-code"
                      >
                        {editingIndex !== null ? (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Update
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {editingIndex !== null && (
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={cancelEdit}
                          className="w-full"
                          data-testid="button-cancel-edit"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cost Codes List */}
                <div>
                  {(form.watch("costCodes")?.length || 0) > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-lg">Cost Codes</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {form.watch("costCodes")?.map((costCode, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                            <div className="flex-1">
                              <div className="font-semibold text-lg">{costCode.scope}</div>
                              <div className="text-sm text-muted-foreground font-mono">
                                {costCode.projectNumber}-{costCode.phaseCode}-{costCode.standardCode}
                              </div>
                              <div className="text-base font-semibold text-green-600 dark:text-green-400">
                                ${parseFloat(costCode.budget).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => editCostCode(index)}
                                data-testid={`button-edit-cost-code-${index}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
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
            ) : currentStep === 'budget' ? (
              <Button
                type="submit"
                className="flex-1 h-12 text-base"
                data-testid="button-next-materials"
              >
                Next: Materials Import
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
              onClick={() => {
                if (currentStep === 'info') {
                  navigate("/projects");
                } else if (currentStep === 'budget') {
                  setCurrentStep('info');
                } else if (currentStep === 'materials') {
                  setCurrentStep('budget');
                }
              }}
              className="h-12 text-base"
              data-testid="button-back-step"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentStep === 'info' ? 'Cancel' : 
               currentStep === 'budget' ? 'Back to Info' : 'Back to Budget'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}