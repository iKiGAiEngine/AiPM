import { useState, useRef } from "react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Download, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MaterialRow {
  sku: string;
  description: string;
  manufacturer?: string;
  model?: string;
  category?: string;
  unit: string;
  lastCost: string;
  leadTimeDays: string;
  finish?: string;
  minOrderQty?: string;
}

interface ImportResult {
  success: number;
  errors: Array<{
    row: number;
    error: string;
    data: MaterialRow;
  }>;
}

export default function ImportMaterials() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [csvData, setCsvData] = useState<MaterialRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  const parseCsv = (csvText: string): MaterialRow[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Map CSV headers to our expected field names
    const fieldMap: Record<string, string> = {
      'sku': 'sku',
      'description': 'description', 
      'manufacturer': 'manufacturer',
      'model': 'model',
      'category': 'category',
      'unit': 'unit',
      'lastcost': 'lastCost',
      'last cost': 'lastCost',
      'cost': 'lastCost',
      'price': 'lastCost',
      'leadtimedays': 'leadTimeDays',
      'lead time': 'leadTimeDays',
      'leadtime': 'leadTimeDays',
      'lead': 'leadTimeDays',
      'finish': 'finish',
      'color': 'finish',
      'minorderqty': 'minOrderQty',
      'min order': 'minOrderQty',
      'minqty': 'minOrderQty'
    };

    const data: MaterialRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        const fieldName = fieldMap[header] || header;
        if (values[index]) {
          row[fieldName] = values[index];
        }
      });
      
      if (row.sku && row.description && row.unit) {
        data.push(row as MaterialRow);
      }
    }
    
    return data;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      try {
        const parsed = parseCsv(csvText);
        setCsvData(parsed);
        setIsPreview(true);
        setImportResult(null);
        
        toast({
          title: "File uploaded",
          description: `Found ${parsed.length} materials to import.`,
        });
      } catch (error) {
        toast({
          title: "Parse error",
          description: "Could not parse the CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const importMaterials = useMutation({
    mutationFn: async (materials: MaterialRow[]) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const response = await fetch('/api/materials/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          organizationId: currentOrganization.id,
          materials: materials.map(m => ({
            ...m,
            lastCost: parseFloat(m.lastCost || '0'),
            leadTimeDays: parseInt(m.leadTimeDays || '7'),
            minOrderQty: parseInt(m.minOrderQty || '1'),
          }))
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import materials');
      }

      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
      
      toast({
        title: "Import completed",
        description: `Successfully imported ${result.success} materials. ${result.errors.length} errors.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadTemplate = () => {
    const template = `SKU,Description,Manufacturer,Model,Category,Unit,LastCost,LeadTimeDays,Finish,MinOrderQty
TLE-001-CHR,Toilet Paper Dispenser,American Standard,123-ABC,Plumbing,Each,45.99,7,Chrome,1
DWR-002-SS,Paper Towel Dispenser,Bradley Corp,PT-456,Plumbing,Each,125.00,10,Stainless Steel,1
MIR-003-FR,Framed Mirror,Bobrick,B-165 2436,Plumbing,Each,180.50,14,Stainless Steel,1`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'materials_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          asChild
          data-testid="button-back"
        >
          <Link to="/materials">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Materials from CSV</h1>
          <p className="text-muted-foreground">Bulk import materials from your Excel/CSV file</p>
        </div>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            CSV Format Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Required Columns:</h4>
              <ul className="text-sm space-y-1">
                <li>• <strong>SKU</strong>: Your part number</li>
                <li>• <strong>Description</strong>: Material description</li>
                <li>• <strong>Unit</strong>: Each, Linear Foot, etc.</li>
                <li>• <strong>LastCost</strong>: Price in dollars</li>
                <li>• <strong>LeadTimeDays</strong>: Delivery days</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Optional Columns:</h4>
              <ul className="text-sm space-y-1">
                <li>• Manufacturer, Model, Category</li>
                <li>• Finish, MinOrderQty</li>
                <li>• Headers are case-insensitive</li>
                <li>• Alternative names accepted (Cost, Price, Lead Time)</li>
              </ul>
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button
              onClick={downloadTemplate}
              variant="outline"
              data-testid="button-download-template"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-upload-csv"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload CSV File
            </Button>
          </div>
          
          <Input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Preview */}
      {isPreview && csvData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Preview Materials ({csvData.length} items)</CardTitle>
              <Button
                onClick={() => importMaterials.mutate(csvData)}
                disabled={importMaterials.isPending}
                data-testid="button-import"
              >
                {importMaterials.isPending ? 'Importing...' : 'Import All Materials'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Lead Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 10).map((material, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{material.sku}</TableCell>
                      <TableCell>{material.description}</TableCell>
                      <TableCell>{material.manufacturer || 'N/A'}</TableCell>
                      <TableCell>{material.unit}</TableCell>
                      <TableCell>${material.lastCost}</TableCell>
                      <TableCell>{material.leadTimeDays} days</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {csvData.length > 10 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing first 10 of {csvData.length} materials...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="default" className="bg-green-100 text-green-800">
                {importResult.success} Successful
              </Badge>
              {importResult.errors.length > 0 && (
                <Badge variant="destructive">
                  {importResult.errors.length} Errors
                </Badge>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Errors to Fix:</h4>
                {importResult.errors.map((error, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Row {error.row}:</strong> {error.error}
                      <br />
                      <span className="text-sm">SKU: {error.data.sku}, Description: {error.data.description}</span>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            <div className="flex gap-4">
              <Button asChild>
                <Link to="/materials">View Materials Catalog</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsPreview(false);
                  setCsvData([]);
                  setImportResult(null);
                }}
              >
                Import Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}