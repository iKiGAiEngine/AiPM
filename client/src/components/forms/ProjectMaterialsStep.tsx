import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Edit, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface MaterialImportRun {
  id: string;
  sourceFilename: string;
  status: 'pending' | 'review' | 'approved' | 'rejected';
  rowCount: number;
  warningsJson?: any;
  createdAt: string;
}

interface MaterialImportLine {
  id: string;
  rawRowJson?: any;
  category?: string;
  manufacturer?: string;
  model?: string;
  sku?: string;
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
  onNext: () => void;
  onPrevious: () => void;
}

export function ProjectMaterialsStep({ projectId, onNext, onPrevious }: ProjectMaterialsStepProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [currentRun, setCurrentRun] = useState<MaterialImportRunDetails | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingLine, setEditingLine] = useState<MaterialImportLine | null>(null);
  
  const queryClient = useQueryClient();

  // Mutations for file upload and processing
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/projects/${projectId}/material-import/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      setUploadProgress(100);
      // Fetch the import run details
      const runResponse = await fetch(`/api/material-imports/${data.runId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (runResponse.ok) {
        const runData = await runResponse.json();
        setCurrentRun(runData);
      }
      setIsUploadDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('Upload failed:', error);
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (runId: string) => {
      const response = await fetch(`/api/material-imports/${runId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/materials`] });
      setCurrentRun(null);
    }
  });

  // Handle file drop
  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadProgress(0);
      setIsUploadDialogOpen(true);
      uploadMutation.mutate(file);
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/material-import/template', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'material-import-template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download template:', error);
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
              <Badge variant={currentRun.status === 'approved' ? 'default' : 'secondary'}>
                {currentRun.status}
              </Badge>
              {currentRun.status === 'pending' && (
                <Button 
                  onClick={() => approveMutation.mutate(currentRun.id)}
                  disabled={approveMutation.isPending || currentRun.summary.invalidLines > 0}
                  data-testid="button-approve-import"
                >
                  {approveMutation.isPending ? 'Approving...' : 'Approve Import'}
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
              <div className="text-2xl font-bold text-green-600">{currentRun.summary.validLines}</div>
              <div className="text-sm text-muted-foreground">Valid Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{currentRun.summary.invalidLines}</div>
              <div className="text-sm text-muted-foreground">Invalid Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{currentRun.summary.totalLines}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
          </div>

          <Separator />

          {/* Cost Code Summary */}
          {Object.keys(currentRun.summary.costCodeTotals).length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Cost Code Summary</h4>
              <div className="grid gap-2">
                {Object.entries(currentRun.summary.costCodeTotals).map(([costCode, totals]) => (
                  <div key={costCode} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="font-medium">{costCode}</span>
                    <div className="text-sm">
                      <span className="mr-4">Qty: {totals.qty.toFixed(2)}</span>
                      <span>Value: ${totals.value.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
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
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Cost Code</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRun.lines.slice(0, 20).map((line) => (
                    <TableRow key={line.id} data-testid={`row-material-${line.id}`}>
                      <TableCell>
                        {line.valid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{line.description}</TableCell>
                      <TableCell>{line.manufacturer}</TableCell>
                      <TableCell>{line.unit}</TableCell>
                      <TableCell>{line.qty}</TableCell>
                      <TableCell>{line.unitPrice ? `$${Number(line.unitPrice).toFixed(2)}` : '-'}</TableCell>
                      <TableCell>{line.costCode}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingLine(line)}
                          data-testid={`button-edit-${line.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
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
          Add materials to your project by importing an Excel file or entering them manually.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'manual')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" data-testid="tab-upload">Import from Excel</TabsTrigger>
          <TabsTrigger value="manual" data-testid="tab-manual">Manual Entry</TabsTrigger>
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
                  Upload an Excel file containing your project materials. Download our template to ensure proper formatting.
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
                    isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  }`}
                  data-testid="dropzone-upload"
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    {isDragActive ? 'Drop your Excel file here' : 'Drop Excel file here or click to browse'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports .xlsx files up to 20MB
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            renderImportResults()
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
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
                  <Input id="description" placeholder="Material description" data-testid="input-description" />
                </div>
                <div>
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input id="manufacturer" placeholder="Manufacturer name" data-testid="input-manufacturer" />
                </div>
                <div>
                  <Label htmlFor="unit">Unit *</Label>
                  <Select>
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
                  <Input id="qty" type="number" placeholder="0" data-testid="input-qty" />
                </div>
                <div>
                  <Label htmlFor="unitPrice">Unit Price</Label>
                  <Input id="unitPrice" type="number" placeholder="0.00" data-testid="input-unit-price" />
                </div>
                <div>
                  <Label htmlFor="costCode">Cost Code</Label>
                  <Input id="costCode" placeholder="Cost code" data-testid="input-cost-code" />
                </div>
              </div>
              <div className="mt-4">
                <Button data-testid="button-add-material">Add Material</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious} data-testid="button-previous">
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
              {uploadProgress < 100 ? 'Uploading and parsing...' : 'Processing complete!'}
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
                <Label htmlFor="edit-manufacturer">Manufacturer</Label>
                <Input 
                  id="edit-manufacturer" 
                  defaultValue={editingLine.manufacturer} 
                  data-testid="input-edit-manufacturer"
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
            <Button data-testid="button-save-changes">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}