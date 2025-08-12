import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Upload,
  FileText,
  Loader2,
  Eye,
  Check
} from "lucide-react";

interface Invoice {
  id: string;
  number: string;
  vendor: string;
  amount: number;
  status: 'auto_approved' | 'exception' | 'processing';
  matchStatus: string;
  poNumber?: string;
  deliveryNumber?: string;
  variance?: number;
  variancePercentage?: number;
  processedAt?: string;
  flaggedAt?: string;
  exceptions?: string[];
}

// Mock data
const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: 'INV-2024-1847',
    vendor: 'Bobrick Hardware',
    amount: 814.80,
    status: 'auto_approved',
    matchStatus: 'matched',
    poNumber: 'PO-2024-045',
    deliveryNumber: 'DEL-2024-089',
    processedAt: '2 hours ago'
  },
  {
    id: '2',
    number: 'INV-2024-1851',
    vendor: 'ABC Supply Co.',
    amount: 1221.00,
    status: 'exception',
    matchStatus: 'price_variance',
    poNumber: 'PO-2024-048',
    deliveryNumber: 'DEL-2024-092',
    variance: 150.00,
    variancePercentage: 14,
    flaggedAt: '4 hours ago',
    exceptions: ['Invoice amount exceeds PO by $150.00 (14%)']
  },
  {
    id: '3',
    number: 'INV-2024-1852',
    vendor: 'FireSafe Systems',
    amount: 3847.50,
    status: 'processing',
    matchStatus: 'processing',
    processedAt: 'Processing OCR...'
  }
];

const mockExceptionStats = {
  priceVariance: 2,
  quantityVariance: 1,
  missingPO: 0,
  taxErrors: 1
};

const getStatusIcon = (status: Invoice['status']) => {
  switch (status) {
    case 'auto_approved':
      return CheckCircle;
    case 'exception':
      return AlertTriangle;
    case 'processing':
      return Clock;
    default:
      return Clock;
  }
};

const getStatusColor = (status: Invoice['status']) => {
  switch (status) {
    case 'auto_approved':
      return 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800';
    case 'exception':
      return 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800';
    case 'processing':
      return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800';
    default:
      return 'border-border bg-background';
  }
};

const getStatusTextColor = (status: Invoice['status']) => {
  switch (status) {
    case 'auto_approved':
      return 'text-green-600 dark:text-green-400';
    case 'exception':
      return 'text-amber-600 dark:text-amber-400';
    case 'processing':
      return 'text-blue-600 dark:text-blue-400';
    default:
      return 'text-muted-foreground';
  }
};

export default function InvoiceProcessing() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle>Invoice Processing & 3-Way Match</CardTitle>
          <p className="text-sm text-muted-foreground">Recent invoice submissions with automated matching</p>
        </div>
        <Button data-testid="button-upload-invoice">
          <Upload className="w-4 h-4 mr-2" />
          Upload New Invoice
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Invoice List */}
        <div className="space-y-4">
          {mockInvoices.map((invoice) => {
            const StatusIcon = getStatusIcon(invoice.status);
            const statusColorClass = getStatusColor(invoice.status);
            const statusTextClass = getStatusTextColor(invoice.status);
            
            return (
              <div 
                key={invoice.id}
                className={`border rounded-lg p-4 ${statusColorClass}`}
                data-testid={`invoice-item-${invoice.id}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      invoice.status === 'auto_approved' ? 'bg-green-500' :
                      invoice.status === 'exception' ? 'bg-amber-500' :
                      'bg-blue-500'
                    }`}>
                      {invoice.status === 'processing' ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <StatusIcon className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <div className={`font-medium ${statusTextClass}`} data-testid={`invoice-number-${invoice.id}`}>
                        {invoice.number}
                      </div>
                      <div className={`text-sm ${statusTextClass.replace('600', '700').replace('400', '300')}`}>
                        {invoice.vendor}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${statusTextClass}`} data-testid={`invoice-amount-${invoice.id}`}>
                      {formatCurrency(invoice.amount)}
                    </div>
                    <div className={`text-sm ${statusTextClass.replace('600', '600').replace('400', '400')}`}>
                      {invoice.status === 'auto_approved' && 'Auto-approved'}
                      {invoice.status === 'exception' && 'Price Exception'}
                      {invoice.status === 'processing' && 'Processing OCR'}
                    </div>
                  </div>
                </div>
                
                {/* Match Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <div className={`font-medium ${statusTextClass.replace('600', '700').replace('400', '200')}`}>
                      PO Match
                    </div>
                    <div className={statusTextClass}>
                      {invoice.poNumber ? (
                        <>
                          {invoice.poNumber} {invoice.status !== 'exception' ? '✓' : '⚠'}
                        </>
                      ) : (
                        'No PO'
                      )}
                    </div>
                    {invoice.variance && (
                      <div className={`text-xs ${statusTextClass.replace('600', '500').replace('400', '300')}`}>
                        {invoice.variance > 0 ? '+' : ''}${Math.abs(invoice.variance).toFixed(2)} ({invoice.variancePercentage}% over)
                      </div>
                    )}
                    {invoice.status === 'auto_approved' && (
                      <div className={`text-xs ${statusTextClass.replace('600', '500').replace('400', '300')}`}>
                        0% variance
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className={`font-medium ${statusTextClass.replace('600', '700').replace('400', '200')}`}>
                      Delivery Match
                    </div>
                    <div className={statusTextClass}>
                      {invoice.deliveryNumber ? (
                        <>
                          {invoice.deliveryNumber} ✓
                        </>
                      ) : (
                        'No delivery'
                      )}
                    </div>
                    {(invoice.status === 'auto_approved' || invoice.status === 'exception') && (
                      <div className={`text-xs ${statusTextClass.replace('600', '500').replace('400', '300')}`}>
                        0% variance
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className={`font-medium ${statusTextClass.replace('600', '700').replace('400', '200')}`}>
                      Status
                    </div>
                    <div className={statusTextClass}>
                      {invoice.status === 'auto_approved' && 'Exported to ERP'}
                      {invoice.status === 'exception' && 'Pending Review'}
                      {invoice.status === 'processing' && 'OCR extraction in progress...'}
                    </div>
                    <div className={`text-xs ${statusTextClass.replace('600', '500').replace('400', '300')}`}>
                      {invoice.processedAt}
                    </div>
                  </div>
                </div>

                {/* Exception Actions */}
                {invoice.status === 'exception' && invoice.exceptions && (
                  <div className="pt-3 border-t border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                      <div className={`text-sm ${statusTextClass.replace('600', '700').replace('400', '200')}`}>
                        <span className="font-medium">Exception:</span> {invoice.exceptions[0]}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" data-testid={`button-review-exception-${invoice.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                        <Button size="sm" data-testid={`button-approve-override-${invoice.id}`}>
                          <Check className="w-4 h-4 mr-2" />
                          Approve Override
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Processing Progress */}
                {invoice.status === 'processing' && (
                  <div className={`text-sm ${statusTextClass.replace('600', '700').replace('400', '200')}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>OCR extraction in progress...</span>
                    </div>
                    <div className="text-xs text-blue-500 dark:text-blue-300 ml-4">
                      Expected completion: 30-60 seconds
                    </div>
                    <Progress value={65} className="mt-2 w-full" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Exception Center Summary */}
        <div className="pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-foreground">Exception Center Summary</h4>
            <Button variant="ghost" size="sm" data-testid="button-view-exception-center">
              View Exception Center
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-foreground" data-testid="stat-price-variance">
                {mockExceptionStats.priceVariance}
              </div>
              <div className="text-sm text-muted-foreground">Price Variance</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-foreground" data-testid="stat-quantity-variance">
                {mockExceptionStats.quantityVariance}
              </div>
              <div className="text-sm text-muted-foreground">Quantity Variance</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-foreground" data-testid="stat-missing-po">
                {mockExceptionStats.missingPO}
              </div>
              <div className="text-sm text-muted-foreground">Missing PO</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-foreground" data-testid="stat-tax-errors">
                {mockExceptionStats.taxErrors}
              </div>
              <div className="text-sm text-muted-foreground">Tax Errors</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
