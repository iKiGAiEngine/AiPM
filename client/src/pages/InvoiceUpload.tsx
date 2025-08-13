import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Camera, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Scan
} from "lucide-react";

const uploadSchema = z.object({
  file: z.any().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  vendorName: z.string().min(1, "Vendor name is required"),
  amount: z.string().min(1, "Amount is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().optional(),
});

type UploadFormData = z.infer<typeof uploadSchema>;

interface OCRResult {
  invoiceNumber: string;
  vendorName: string;
  amount: string;
  invoiceDate: string;
  dueDate: string;
  confidence: number;
}

export default function InvoiceUpload() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrProgress, setOCRProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [ocrResult, setOCRResult] = useState<OCRResult | null>(null);

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      invoiceNumber: "",
      vendorName: "",
      amount: "",
      invoiceDate: "",
      dueDate: "",
      description: "",
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, JPG, or PNG file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    
    // Create preview URL for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }

    // Start OCR processing simulation
    await simulateOCRProcessing(file);
  };

  const simulateOCRProcessing = async (file: File) => {
    setIsProcessingOCR(true);
    setOCRProgress(0);

    // Simulate OCR processing with progress
    const progressInterval = setInterval(() => {
      setOCRProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 3000));

    clearInterval(progressInterval);
    setOCRProgress(100);

    // Mock OCR results based on file name patterns
    const mockOCRResult: OCRResult = {
      invoiceNumber: `INV-2024-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
      vendorName: file.name.includes('abc') ? 'ABC Supply Co.' : 
                  file.name.includes('home') ? 'Home Depot' :
                  file.name.includes('lowes') ? 'Lowes Companies' :
                  'Metro Building Supply',
      amount: (Math.random() * 5000 + 100).toFixed(2),
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      confidence: 0.85 + Math.random() * 0.1,
    };

    setOCRResult(mockOCRResult);
    setIsProcessingOCR(false);

    // Auto-fill form with OCR results
    form.setValue("invoiceNumber", mockOCRResult.invoiceNumber);
    form.setValue("vendorName", mockOCRResult.vendorName);
    form.setValue("amount", mockOCRResult.amount);
    form.setValue("invoiceDate", mockOCRResult.invoiceDate);
    form.setValue("dueDate", mockOCRResult.dueDate);

    toast({
      title: "OCR Processing Complete",
      description: `Extracted invoice data with ${(mockOCRResult.confidence * 100).toFixed(0)}% confidence`,
    });
  };

  const onSubmit = async (data: UploadFormData) => {
    if (!uploadedFile) {
      toast({
        title: "No File Selected",
        description: "Please upload an invoice file first",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('vendorName', data.vendorName);
      formData.append('invoiceNumber', data.invoiceNumber);
      formData.append('amount', data.amount);
      formData.append('invoiceDate', data.invoiceDate);
      formData.append('dueDate', data.dueDate);
      if (data.description) formData.append('description', data.description);

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload invoice');

      toast({
        title: "Invoice Uploaded Successfully",
        description: "Your invoice has been processed and added to the system",
      });

      setLocation("/invoices");
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraCapture = () => {
    // In a real app, this would open camera interface
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = handleFileUpload as any;
    input.click();
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/invoices")}
          data-testid="button-back-to-invoices"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Invoices
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload Invoice</h1>
          <p className="text-muted-foreground">Upload and process vendor invoices with AI-powered OCR</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              {uploadedFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <FileText className="w-12 h-12 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {previewUrl && (
                    <div className="max-w-xs mx-auto">
                      <img 
                        src={previewUrl} 
                        alt="Invoice preview" 
                        className="w-full h-auto rounded border"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <Upload className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">Drop your invoice here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse files
                    </p>
                  </div>
                </div>
              )}
              
              <div className="mt-4 flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  data-testid="button-browse-files"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCameraCapture}
                  data-testid="button-take-photo"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
              </div>

              <input
                id="file-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-file-upload"
              />
            </div>

            {/* OCR Processing */}
            {isProcessingOCR && (
              <Alert>
                <Scan className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>Processing document with OCR...</p>
                    <Progress value={ocrProgress} className="w-full" />
                    <p className="text-xs text-muted-foreground">
                      Extracting text and identifying invoice fields
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* OCR Results */}
            {ocrResult && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">OCR Processing Complete</p>
                    <p className="text-xs text-muted-foreground">
                      Confidence: {(ocrResult.confidence * 100).toFixed(0)}% • 
                      Form fields auto-populated
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, JPG, PNG • Max size: 10MB
            </p>
          </CardContent>
        </Card>

        {/* Invoice Details Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice Details
              {ocrResult && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    form.setValue("invoiceNumber", ocrResult.invoiceNumber);
                    form.setValue("vendorName", ocrResult.vendorName);
                    form.setValue("amount", ocrResult.amount);
                    form.setValue("invoiceDate", ocrResult.invoiceDate);
                    form.setValue("dueDate", ocrResult.dueDate);
                  }}
                  data-testid="button-apply-ocr"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Apply OCR
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                  <Input
                    {...form.register("invoiceNumber")}
                    id="invoiceNumber"
                    placeholder="INV-2024-001"
                    data-testid="input-invoice-number"
                  />
                  {form.formState.errors.invoiceNumber && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.invoiceNumber.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendorName">Vendor Name *</Label>
                  <Input
                    {...form.register("vendorName")}
                    id="vendorName"
                    placeholder="ABC Supply Co."
                    data-testid="input-vendor-name"
                  />
                  {form.formState.errors.vendorName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.vendorName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    {...form.register("amount")}
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="1234.56"
                    data-testid="input-amount"
                  />
                  {form.formState.errors.amount && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceDate">Invoice Date *</Label>
                  <Input
                    {...form.register("invoiceDate")}
                    id="invoiceDate"
                    type="date"
                    data-testid="input-invoice-date"
                  />
                  {form.formState.errors.invoiceDate && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.invoiceDate.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    {...form.register("dueDate")}
                    id="dueDate"
                    type="date"
                    data-testid="input-due-date"
                  />
                  {form.formState.errors.dueDate && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.dueDate.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    {...form.register("description")}
                    id="description"
                    placeholder="Invoice description or notes..."
                    data-testid="input-description"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isUploading || !uploadedFile}
                  className="flex-1"
                  data-testid="button-submit-invoice"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Invoice
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/invoices")}
                  data-testid="button-cancel-upload"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}