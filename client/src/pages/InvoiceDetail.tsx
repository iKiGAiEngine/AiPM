import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, Check, X, AlertTriangle } from "lucide-react";

export default function InvoiceDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  // Mock invoice data based on the ID from InvoiceProcessing component
  const getInvoiceData = (invoiceId: string) => {
    const invoices = {
      '1': {
        id: '1',
        number: 'INV-2024-1847',
        vendor: 'Bobrick Hardware',
        amount: 814.80,
        status: 'auto_approved' as const,
        matchStatus: 'matched',
        poNumber: 'PO-2024-045',
        deliveryNumber: 'DEL-2024-089',
        processedAt: '2 hours ago',
        date: '2024-01-15',
        dueDate: '2024-02-14',
        description: 'Hardware supplies for Project Alpha',
        lineItems: [
          { description: 'Door Hardware Kit', quantity: 5, unitPrice: 95.50, total: 477.50 },
          { description: 'Cabinet Hinges', quantity: 20, unitPrice: 8.90, total: 178.00 },
          { description: 'Lock Sets', quantity: 3, unitPrice: 53.10, total: 159.30 }
        ]
      },
      '2': {
        id: '2',
        number: 'INV-2024-1851',
        vendor: 'ABC Supply Co.',
        amount: 1221.00,
        status: 'exception' as const,
        matchStatus: 'price_variance',
        poNumber: 'PO-2024-048',
        deliveryNumber: 'DEL-2024-092',
        variance: 150.00,
        variancePercentage: 14,
        flaggedAt: '4 hours ago',
        exceptions: ['Invoice amount exceeds PO by $150.00 (14%)'],
        date: '2024-01-16',
        dueDate: '2024-02-15',
        description: 'Construction materials for Site B',
        lineItems: [
          { description: 'Lumber 2x4x8', quantity: 100, unitPrice: 6.50, total: 650.00 },
          { description: 'Concrete Mix', quantity: 25, unitPrice: 12.40, total: 310.00 },
          { description: 'Steel Rebar', quantity: 50, unitPrice: 5.22, total: 261.00 }
        ]
      }
    };
    return invoices[invoiceId as keyof typeof invoices];
  };

  const invoice = getInvoiceData(id || '');

  if (!invoice) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive">Invoice not found</p>
              <Button onClick={() => setLocation("/invoices")} className="mt-4">
                Back to Invoices
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleApprove = () => {
    console.log(`Approving invoice ${invoice.id}`);
    setLocation("/invoices");
  };

  const handleReject = () => {
    console.log(`Rejecting invoice ${invoice.id}`);
    setLocation("/invoices");
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{invoice.number}</h1>
          <p className="text-muted-foreground">{invoice.vendor}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={invoice.status === 'exception' ? 'destructive' : 'default'}>
            {invoice.status === 'exception' ? 'Exception' : 'Auto-Approved'}
          </Badge>
          <Button variant="outline" size="sm" data-testid="button-download-invoice">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Invoice Number</label>
                  <p className="font-medium">{invoice.number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <p className="font-medium text-lg">{formatCurrency(invoice.amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Invoice Date</label>
                  <p className="font-medium">{invoice.date}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                  <p className="font-medium">{invoice.dueDate}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="font-medium">{invoice.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoice.lineItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity} × {formatCurrency(item.unitPrice)}</p>
                    </div>
                    <p className="font-medium">{formatCurrency(item.total)}</p>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 border-t border-border font-bold">
                  <span>Total</span>
                  <span className="text-lg">{formatCurrency(invoice.amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Matching Status */}
          <Card>
            <CardHeader>
              <CardTitle>3-Way Match Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">PO Number</label>
                <p className="font-medium">{invoice.poNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Delivery Number</label>
                <p className="font-medium">{invoice.deliveryNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Match Status</label>
                <p className={`font-medium ${invoice.status === 'exception' ? 'text-destructive' : 'text-green-600'}`}>
                  {invoice.status === 'exception' ? 'Price Variance' : 'Matched'}
                </p>
              </div>
              {'variance' in invoice && invoice.variance && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Variance</label>
                  <p className="font-medium text-destructive">
                    +{formatCurrency(invoice.variance)} ({invoice.variancePercentage}%)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exceptions */}
          {invoice.status === 'exception' && invoice.exceptions && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Exceptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {invoice.exceptions.map((exception, index) => (
                    <p key={index} className="text-sm text-destructive">{exception}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {invoice.status === 'exception' && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleApprove} 
                  className="w-full"
                  data-testid="button-approve-invoice"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve Override
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleReject}
                  className="w-full"
                  data-testid="button-reject-invoice"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject Invoice
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}