import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  X,
  Edit,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface MaterialImportRun {
  id: string;
  sourceFilename: string;
  status: "pending" | "review" | "approved" | "rejected";
  rowCount: number;
  warningsJson?: any;
  createdAt: string;
}

interface MaterialImportLine {
  id: string;
  rawRowJson?: any;
  category?: string;
  model?: string;
  description?: string;
  unit?: string;
  qty?: string;
  unitPrice?: string;
  costCode?: string;
  phaseCode?: string;
  valid: boolean;
  errorsJson?: any[];
  suggestionsJson?: any[];
}

interface MaterialImportRunDetails extends MaterialImportRun {
  lines: MaterialImportLine[];
  summary: {
    totalLines: number;
    validLines: number;
    invalidLines: number;
    costCodeTotals: Record<string, { qty: number; value: number }>;
  };
}

interface ProjectMaterialsStepProps {
  projectId: string;
  costCodes: string[];
  onNext: () => void;
  onPrevious: () => void;
}

export function ProjectMaterialsStep({
  projectId,
  costCodes,
  onNext,
  onPrevious,
}: ProjectMaterialsStepProps) {
  // Safety check for projectId
  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Loading project...</p>
          <p className="text-sm text-muted-foreground mt-2">Please wait while the project is being created.</p>
        </div>
      </div>
    );
  }
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [currentRun, setCurrentRun] = useState<MaterialImportRunDetails | null>(
    null,
  );
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingLine, setEditingLine] = useState<MaterialImportLine | null>(
    null,
  );
  const [selectedCostCode, setSelectedCostCode] = useState<string>("");
  const [manualMaterial, setManualMaterial] = useState({
    description: "",
    manufacturer: "",
    unit: "",
    quantity: "",
    unitPrice: "",
  });

  const queryClient = useQueryClient();

  // Fetch project data to get budget and cost code information
  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Calculate cost code budget breakdown
  const costCodeBudgets = React.useMemo(() => {
    if (!project || !costCodes.length) return {};
    
    const totalBudget = project?.budget ? parseFloat(project.budget.toString()) : 0;
    const budgetPerCode = totalBudget / costCodes.length;
    return costCodes.reduce((acc, code) => {
      acc[code] = {
        allocated: budgetPerCode,
        used: 0, // TODO: Calculate from existing materials
        remaining: budgetPerCode
      };
      return acc;
    }, {} as Record<string, { allocated: number; used: number; remaining: number }>);
  }, [project, costCodes]);

  // Mutations for file upload and processing
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress(10); // Start progress
      const formData = new FormData();
      formData.append("file", file);

      setUploadProgress(30); // File prepared
      
      const response = await fetch(
        `/api/projects/${projectId}/material-import/upload`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );

      setUploadProgress(70); // Upload complete, processing

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload error:", errorText);
        throw new Error(errorText);
      }

      setUploadProgress(90); // Response received
      return response.json();
    },
    onSuccess: async (data) => {
      setUploadProgress(95);
      // Fetch the import run details
      const runResponse = await fetch(`/api/material-imports/${data.runId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      if (runResponse.ok) {
        const runData = await runResponse.json();
        setCurrentRun(runData);
      }
      setUploadProgress(100);
      setIsUploadDialogOpen(false);
    },
    onError: (error: any) => {
      console.error("Upload failed:", error);
      setUploadProgress(0);
      alert(`Upload failed: ${error.message || "Unknown error"}`);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (runId: string) => {
      const response = await fetch(`/api/material-imports/${runId}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/materials`],
      });
      setCurrentRun(null);
    },
  });

  // Mutation for updating import line
  const updateLineMutation = useMutation({
    mutationFn: async ({ lineId, updates }: { lineId: string; updates: any }) => {
      const response = await fetch(`/api/material-imports/${currentRun?.id}/line/${lineId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh the current run data
      if (currentRun) {
        fetch(`/api/material-imports/${currentRun.id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }).then(response => response.json()).then(setCurrentRun);
      }
      setEditingLine(null);
    },
  });

  // Mutation for deleting import line
  const deleteLineMutation = useMutation({
    mutationFn: async (lineId: string) => {
      const response = await fetch(`/api/material-imports/${currentRun?.id}/line/${lineId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh the current run data
      if (currentRun) {
        fetch(`/api/material-imports/${currentRun.id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }).then(response => response.json()).then(setCurrentRun);
      }
    },
  });

  // Handle file drop
  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      console.log('Files dropped:', { acceptedFiles, rejectedFiles });
      const file = acceptedFiles[0];
      if (file) {
        console.log('Processing file:', file.name, file.type, file.size);
        setUploadProgress(0);
        setIsUploadDialogOpen(true);
        uploadMutation.mutate(file);
      } else if (rejectedFiles.length > 0) {
        console.error('File rejected:', rejectedFiles[0]);
        alert(`File rejected: ${rejectedFiles[0].errors?.[0]?.message || 'Invalid file type'}`);
      }
    },
    [uploadMutation],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls", ".xlsx"],
      "text/csv": [".csv"]
    },
    maxFiles: 1,
    multiple: false,
    noClick: false,
    noKeyboard: false
  });

  const downloadTemplate = async () => {
    try {
      const response = await fetch("/api/material-import/template", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "material-import-template.xlsx";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to download template:", error);
    }
  };

  // Render import results
  const renderImportResults = () => {
    if (!currentRun) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Import Results: {currentRun.sourceFilename}
            <div className="flex gap-2">
              <Badge
                variant={
                  currentRun.status === "approved" ? "default" : "secondary"
                }
              >
                {currentRun.status}
              </Badge>
              {currentRun.status === "pending" && (
                <Button
                  onClick={() => approveMutation.mutate(currentRun.id)}
                  disabled={
                    approveMutation.isPending ||
                    currentRun.summary.invalidLines > 0
                  }
                  data-testid="button-approve-import"
                >
                  {approveMutation.isPending
                    ? "Approving..."
                    : "Approve Import"}
                </Button>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Review and validate imported materials before adding to project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {currentRun.summary.validLines}
              </div>
              <div className="text-sm text-muted-foreground">Valid Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {currentRun.summary.invalidLines}
              </div>
              <div className="text-sm text-muted-foreground">Invalid Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {currentRun.summary.totalLines}
              </div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
          </div>

          <Separator />

          {/* Cost Code Summary */}
          {Object.keys(currentRun.summary.costCodeTotals).length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Cost Code Summary</h4>
              <div className="grid gap-2">
                {Object.entries(currentRun.summary.costCodeTotals).map(
                  ([costCode, totals]) => (
                    <div
                      key={costCode}
                      className="flex justify-between items-center p-2 bg-muted rounded"
                    >
                      <span className="font-medium">{costCode}</span>
                      <div className="text-sm">
                        <span className="mr-4">
                          Qty: {totals.qty.toFixed(2)}
                        </span>
                        <span>Value: ${totals.value.toFixed(2)}</span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Materials List */}
          <div>
            <h4 className="font-medium mb-2">Imported Materials</h4>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Model #</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Cost Code</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRun.lines.slice(0, 20).map((line) => (
                    <TableRow
                      key={line.id}
                      data-testid={`row-material-${line.id}`}
                    >
                      <TableCell>
                        {line.valid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {line.description}
                      </TableCell>
                      <TableCell>{line.model || '-'}</TableCell>
                      <TableCell>{line.unit}</TableCell>
                      <TableCell>{line.qty}</TableCell>
                      <TableCell>
                        {line.unitPrice
                          ? `$${Number(line.unitPrice).toFixed(2)}`
                          : "-"}
                      </TableCell>
                      <TableCell>{line.costCode}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingLine(line)}
                            data-testid={`button-edit-${line.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this line?')) {
                                deleteLineMutation.mutate(line.id);
                              }
                            }}
                            data-testid={`button-delete-${line.id}`}
                            disabled={deleteLineMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {currentRun.lines.length > 20 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Showing 20 of {currentRun.lines.length} materials
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Project Materials</h2>
        <p className="text-muted-foreground">
          Add materials to your project by importing an Excel file or entering
          them manually.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "upload" | "manual")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" data-testid="tab-upload">
            Import from Excel
          </TabsTrigger>
          <TabsTrigger value="manual" data-testid="tab-manual">
            Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          {!currentRun ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Excel Import
                </CardTitle>
                <CardDescription>
                  Upload an Excel file containing your project materials.
                  Download our template to ensure proper formatting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  data-testid="button-download-template"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>

                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25"
                  }`}
                  data-testid="dropzone-upload"
                >
                  <input 
                    {...getInputProps()} 
                    accept=".xlsx,.xls,.csv"
                    type="file"
                  />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    {isDragActive
                      ? "Drop your Excel file here"
                      : "Drop Excel file here or click to browse"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports .xlsx, .xls, .csv files up to 20MB
                  </p>
                  {uploadMutation.isPending && (
                    <div className="mt-4">
                      <div className="text-sm text-muted-foreground mb-2">
                        Processing file...
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            renderImportResults()
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          {/* Cost Code Budget Summary */}
          {costCodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Cost Code Budget Summary
                </CardTitle>
                <CardDescription>
                  Track budget allocation and usage across cost codes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {costCodes.map((code) => {
                    const budget = costCodeBudgets[code];
                    const utilizationPercent = budget ? (budget.used / budget.allocated) * 100 : 0;
                    
                    return (
                      <div key={code} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{code}</h4>
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-medium">
                              ${budget?.remaining.toFixed(2) || '0.00'} remaining
                            </div>
                            <div className="text-muted-foreground">
                              of ${budget?.allocated.toFixed(2) || '0.00'} allocated
                            </div>
                          </div>
                        </div>
                        <Progress value={utilizationPercent} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Used: ${budget?.used.toFixed(2) || '0.00'}</span>
                          <span>{utilizationPercent.toFixed(1)}% utilized</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Add Material Manually</CardTitle>
              <CardDescription>
                Enter individual materials for this project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={manualMaterial.description}
                    onChange={(e) => setManualMaterial(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Material description"
                    data-testid="input-description"
                  />
                </div>
                <div>
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={manualMaterial.manufacturer}
                    onChange={(e) => setManualMaterial(prev => ({ ...prev, manufacturer: e.target.value }))}
                    placeholder="Manufacturer name"
                    data-testid="input-manufacturer"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit *</Label>
                  <Select value={manualMaterial.unit} onValueChange={(value) => setManualMaterial(prev => ({ ...prev, unit: value }))}>
                    <SelectTrigger data-testid="select-unit">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ea">Each</SelectItem>
                      <SelectItem value="ft">Feet</SelectItem>
                      <SelectItem value="sqft">Square Feet</SelectItem>
                      <SelectItem value="cuyd">Cubic Yards</SelectItem>
                      <SelectItem value="ton">Ton</SelectItem>
                      <SelectItem value="lb">Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="qty">Quantity *</Label>
                  <Input
                    id="qty"
                    type="number"
                    value={manualMaterial.quantity}
                    onChange={(e) => setManualMaterial(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="0"
                    data-testid="input-qty"
                  />
                </div>
                <div>
                  <Label htmlFor="unitPrice">Unit Price</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    value={manualMaterial.unitPrice}
                    onChange={(e) => setManualMaterial(prev => ({ ...prev, unitPrice: e.target.value }))}
                    placeholder="0.00"
                    data-testid="input-unit-price"
                  />
                </div>
                <div>
                  <Label htmlFor="costCode">Cost Code *</Label>
                  <Select value={selectedCostCode} onValueChange={setSelectedCostCode}>
                    <SelectTrigger data-testid="select-cost-code">
                      <SelectValue placeholder="Select cost code" />
                    </SelectTrigger>
                    <SelectContent>
                      {costCodes.map((code) => (
                        <SelectItem key={code} value={code}>
                          <div className="flex flex-col">
                            <span className="font-medium">{code.split(' - ')[0]}</span>
                            <span className="text-xs text-muted-foreground">
                              ${costCodeBudgets[code]?.remaining.toFixed(2) || '0.00'} remaining
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <Button 
                  onClick={() => {
                    // TODO: Add material creation logic
                    console.log('Adding material:', { ...manualMaterial, costCode: selectedCostCode });
                  }}
                  disabled={!manualMaterial.description || !manualMaterial.unit || !manualMaterial.quantity || !selectedCostCode}
                  data-testid="button-add-material"
                >
                  Add Material
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onPrevious}
          data-testid="button-previous"
        >
          Previous
        </Button>
        <Button onClick={onNext} data-testid="button-next">
          Continue
        </Button>
      </div>

      {/* Upload Progress Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent data-testid="dialog-upload-progress">
          <DialogHeader>
            <DialogTitle>Processing Excel File</DialogTitle>
            <DialogDescription>
              Please wait while we process your Excel file...
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Progress value={uploadProgress} className="mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              {uploadProgress < 100
                ? "Uploading and parsing..."
                : "Processing complete!"}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Line Dialog */}
      <Dialog open={!!editingLine} onOpenChange={() => setEditingLine(null)}>
        <DialogContent data-testid="dialog-edit-line">
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
            <DialogDescription>
              Update the material details below.
            </DialogDescription>
          </DialogHeader>
          {editingLine && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  defaultValue={editingLine.description}
                  data-testid="input-edit-description"
                />
              </div>
              <div>
                <Label htmlFor="edit-model">Model #</Label>
                <Input
                  id="edit-model"
                  defaultValue={editingLine.model}
                  data-testid="input-edit-model"
                />
              </div>
              <div>
                <Label htmlFor="edit-unit">Unit</Label>
                <Input
                  id="edit-unit"
                  defaultValue={editingLine.unit}
                  data-testid="input-edit-unit"
                />
              </div>
              <div>
                <Label htmlFor="edit-qty">Quantity</Label>
                <Input
                  id="edit-qty"
                  type="number"
                  defaultValue={editingLine.qty}
                  data-testid="input-edit-qty"
                />
              </div>
              <div>
                <Label htmlFor="edit-unitPrice">Unit Price</Label>
                <Input
                  id="edit-unitPrice"
                  type="number"
                  defaultValue={editingLine.unitPrice}
                  data-testid="input-edit-unit-price"
                />
              </div>
              <div>
                <Label htmlFor="edit-costCode">Cost Code</Label>
                <Input
                  id="edit-costCode"
                  defaultValue={editingLine.costCode}
                  data-testid="input-edit-cost-code"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLine(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (editingLine) {
                  const updates = {
                    description: (document.getElementById('edit-description') as HTMLInputElement)?.value,
                    model: (document.getElementById('edit-model') as HTMLInputElement)?.value,
                    unit: (document.getElementById('edit-unit') as HTMLInputElement)?.value,
                    qty: (document.getElementById('edit-qty') as HTMLInputElement)?.value,
                    unitPrice: (document.getElementById('edit-unitPrice') as HTMLInputElement)?.value,
                    costCode: (document.getElementById('edit-costCode') as HTMLInputElement)?.value,
                  };
                  updateLineMutation.mutate({ lineId: editingLine.id, updates });
                }
              }}
              disabled={updateLineMutation.isPending}
              data-testid="button-save-changes"
            >
              {updateLineMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
