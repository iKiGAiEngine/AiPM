import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Send, FileText, Building, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { PurchaseOrder, PurchaseOrderLine } from "@shared/schema";

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  acknowledged: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  received: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  closed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: purchaseOrder, isLoading, error } = useQuery<PurchaseOrder>({
    queryKey: ['/api/purchase-orders', id],
    queryFn: async () => {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch purchase order');
      return response.json();
    },
    enabled: !!id,
  });

  const { data: lines = [] } = useQuery<PurchaseOrderLine[]>({
    queryKey: ['/api/purchase-orders', id, 'lines'],
    queryFn: async () => {
      const response = await fetch(`/api/purchase-orders/${id}/lines`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch purchase order lines');
      return response.json();
    },
    enabled: !!id,
  });

  // Mutation to send draft purchase order
  const sendPOMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/purchase-orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ status: 'sent' }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send purchase order');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders', id] });
      toast({
        title: 'Success',
        description: 'Purchase order sent to vendor successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send purchase order',
        variant: 'destructive',
      });
    },
  });

  const handleSendPO = () => {
    if (lines.length === 0) {
      toast({
        title: 'Cannot Send',
        description: 'Purchase order must have line items before sending',
        variant: 'destructive',
      });
      return;
    }
    sendPOMutation.mutate();
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const handleDownloadPDF = async () => {
    if (!purchaseOrder) return;
    
    try {
      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${purchaseOrder.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF download failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !purchaseOrder) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive">Failed to load purchase order</p>
              <Button 
                variant="outline" 
                onClick={() => navigate("/purchase-orders")}
                className="mt-4"
              >
                Back to Purchase Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAmount = lines.reduce((sum, line) => sum + (parseFloat(line.unitPrice) * line.quantity), 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/purchase-orders")}
          data-testid="button-back-to-purchase-orders"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Purchase Orders
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{purchaseOrder.number}</h1>
          <p className="text-muted-foreground">Purchase Order Details</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[purchaseOrder.status as keyof typeof statusColors]}>
            {purchaseOrder.status}
          </Badge>
          
          {/* Send button for draft POs */}
          {purchaseOrder.status === 'draft' && (
            <Button 
              onClick={handleSendPO}
              disabled={sendPOMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendPOMutation.isPending ? 'Sending...' : 'Send to Vendor'}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadPDF}
            data-testid="button-download-pdf"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Purchase Order Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Vendor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Vendor ID</label>
              <p className="text-foreground">{purchaseOrder.vendorId}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Project ID</label>
              <p className="text-foreground">{purchaseOrder.projectId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
              <p className="text-foreground font-semibold">{formatCurrency(totalAmount)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-foreground">
                {format(new Date(purchaseOrder.createdAt), 'PPP')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipping Information */}
      {purchaseOrder.shipToAddress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Ship To Address</label>
              <p className="text-foreground whitespace-pre-line">{purchaseOrder.shipToAddress}</p>
            </div>
            {purchaseOrder.requestedDeliveryDate && (
              <div className="mt-4">
                <label className="text-sm font-medium text-muted-foreground">Requested Delivery Date</label>
                <p className="text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(purchaseOrder.requestedDeliveryDate), 'PPP')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No line items found for this purchase order.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={line.id || index}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{line.description}</p>
                        <p className="text-sm text-muted-foreground">Unit: {line.unit}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(parseFloat(line.unitPrice) * line.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {lines.length > 0 && (
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {purchaseOrder.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-line">{purchaseOrder.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}