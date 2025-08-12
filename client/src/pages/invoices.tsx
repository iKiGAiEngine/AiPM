import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { uploadFile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Upload, CheckCircle, AlertTriangle, Clock, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";

export default function Invoices() {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: invoices, isLoading } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/invoices`],
    enabled: !!currentOrganization?.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "uploaded":
        return <Badge variant="secondary">Uploaded</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Processing OCR</Badge>;
      case "matched":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Matched</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Approved</Badge>;
      case "exception":
        return <Badge variant="destructive">Exception</Badge>;
      case "exported":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Exported</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "matched":
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "exception":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-slate-600" />;
    }
  };

  const getMatchStatusBadge = (matchStatus: string, variance?: number) => {
    if (!matchStatus) return null;
    
    switch (matchStatus) {
      case "matched":
        return <Badge className="bg-green-100 text-green-800">Perfect Match</Badge>;
      case "price_variance":
        return <Badge className="bg-amber-100 text-amber-800">Price Variance {variance ? `(${variance > 0 ? '+' : ''}$${variance.toFixed(2)})` : ''}</Badge>;
      case "qty_variance":
        return <Badge className="bg-orange-100 text-orange-800">Quantity Variance</Badge>;
      case "missing_po":
        return <Badge variant="destructive">Missing PO</Badge>;
      default:
        return <Badge variant="secondary">{matchStatus}</Badge>;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentOrganization?.id) return;

    setIsUploading(true);
    try {
      await uploadFile(currentOrganization.id, file, 'invoice');
      toast({
        title: 'Success',
        description: 'Invoice uploaded and processing started',
      });
      setIsUploadOpen(false);
      // Refetch invoices to show the new one
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload invoice',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredInvoices = invoices?.filter((invoice: any) =>
    invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.po?.number.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-600">Process vendor invoices and manage payments</p>
        </div>
        
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-invoice">
              <Upload className="mr-2 h-4 w-4" />
              Upload Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-900">Upload Invoice File</p>
                  <p className="text-xs text-slate-500">PDF, PNG, or JPG up to 10MB</p>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                    id="invoice-upload"
                    data-testid="input-invoice-file"
                  />
                  <label
                    htmlFor="invoice-upload"
                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                      </>
                    )}
                  </label>
                </div>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <p className="font-medium">What happens next:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>OCR extracts invoice data automatically</li>
                  <li>3-way matching with PO and delivery records</li>
                  <li>Automatic approval if within tolerances</li>
                  <li>Exception alerts for variances requiring review</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>All Invoices</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-invoices"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No invoices found</h3>
              <p className="text-slate-600 mb-6">
                {searchTerm ? "Try adjusting your search criteria" : "Upload invoices to get started with automated processing"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsUploadOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Invoice
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Match Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice: any) => (
                    <TableRow key={invoice.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-medium" data-testid={`invoice-${invoice.invoiceNumber}`}>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(invoice.status)}
                          <span>{invoice.invoiceNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`vendor-${invoice.id}`}>
                        {invoice.vendor?.name || "N/A"}
                      </TableCell>
                      <TableCell data-testid={`po-${invoice.id}`}>
                        {invoice.po?.number || "N/A"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell>
                        {getMatchStatusBadge(invoice.matchStatus, invoice.matchVariance)}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`total-${invoice.id}`}>
                        ${parseFloat(invoice.total || 0).toLocaleString()}
                      </TableCell>
                      <TableCell data-testid={`invoice-date-${invoice.id}`}>
                        {invoice.invoiceDate ? 
                          format(new Date(invoice.invoiceDate), "MMM d, yyyy") : 
                          "N/A"
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-view-${invoice.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3-Way Match Summary */}
      <Card>
        <CardHeader>
          <CardTitle>3-Way Match Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {filteredInvoices.filter((inv: any) => inv.matchStatus === 'matched').length}
              </p>
              <p className="text-sm text-green-700">Perfect Matches</p>
              <p className="text-xs text-green-600 mt-1">Auto-approved</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">
                {filteredInvoices.filter((inv: any) => inv.matchStatus === 'price_variance').length}
              </p>
              <p className="text-sm text-amber-700">Price Variances</p>
              <p className="text-xs text-amber-600 mt-1">Needs review</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {filteredInvoices.filter((inv: any) => inv.matchStatus === 'qty_variance').length}
              </p>
              <p className="text-sm text-orange-700">Quantity Issues</p>
              <p className="text-xs text-orange-600 mt-1">Verify deliveries</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {filteredInvoices.filter((inv: any) => inv.matchStatus === 'missing_po').length}
              </p>
              <p className="text-sm text-red-700">Missing POs</p>
              <p className="text-xs text-red-600 mt-1">Requires attention</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Processing Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div>
                  <p className="font-medium text-blue-900">OCR Processing</p>
                  <p className="text-sm text-blue-700">
                    {filteredInvoices.filter((inv: any) => inv.status === 'processing').length} invoices being processed
                  </p>
                </div>
              </div>
              <Progress value={75} className="w-32" />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">Exception Review</p>
                  <p className="text-sm text-amber-700">
                    {filteredInvoices.filter((inv: any) => inv.status === 'exception').length} exceptions require attention
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" data-testid="button-review-exceptions">
                Review All
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Ready for Export</p>
                  <p className="text-sm text-green-700">
                    {filteredInvoices.filter((inv: any) => inv.status === 'approved').length} invoices approved for ERP export
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" data-testid="button-export-approved">
                Export to ERP
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
