import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, DollarSign, Calendar, Building, User } from "lucide-react";
import { format } from "date-fns";
import type { Invoice } from "@shared/schema";

const statusColors = {
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  exception: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  paid: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

const matchStatusColors = {
  matched: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  price_variance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  qty_variance: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  missing_po: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  tax_variance: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  freight_variance: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();

  const { data: invoice, isLoading, error } = useQuery<Invoice>({
    queryKey: ['/api/invoices', id],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch invoice');
      return response.json();
    },
    enabled: !!id,
  });

  const formatCurrency = (amount: string | number | null | undefined) => {
    if (!amount) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Invoice Not Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The invoice you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button asChild>
            <Link to="/invoices">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Invoices
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/invoices">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Invoices
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Invoice {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Created {invoice.createdAt ? format(new Date(invoice.createdAt), 'PPpp') : 'Unknown'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={statusColors[invoice.status as keyof typeof statusColors]}>
            {invoice.status}
          </Badge>
          {invoice.matchStatus && (
            <Badge className={matchStatusColors[invoice.matchStatus as keyof typeof matchStatusColors]}>
              {invoice.matchStatus.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Invoice Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Invoice Number</label>
              <p className="text-lg font-mono">{invoice.invoiceNumber}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Invoice Date</label>
                <p className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'PPP') : 'Not set'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</label>
                <p className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {invoice.dueDate ? format(new Date(invoice.dueDate), 'PPP') : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Financial Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</label>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(invoice.totalAmount)}</p>
            </div>
            {invoice.matchVariance && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Match Variance</label>
                <p className="text-lg font-bold text-red-600">{formatCurrency(invoice.matchVariance)}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {invoice.subtotal && (
                <div>
                  <label className="text-gray-500 dark:text-gray-400">Subtotal</label>
                  <p>{formatCurrency(invoice.subtotal)}</p>
                </div>
              )}
              {invoice.taxAmount && (
                <div>
                  <label className="text-gray-500 dark:text-gray-400">Tax</label>
                  <p>{formatCurrency(invoice.taxAmount)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Related Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="w-5 h-5 mr-2" />
            Related Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Vendor</label>
              <p>Vendor ID: {invoice.vendorId.slice(-8)}</p>
            </div>
            {invoice.poId && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Purchase Order</label>
                <p>PO ID: {invoice.poId.slice(-8)}</p>
              </div>
            )}
            {invoice.projectId && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Project</label>
                <p>Project ID: {invoice.projectId.slice(-8)}</p>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Uploaded By</label>
            <p className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              User ID: {invoice.uploadedById.slice(-8)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Exceptions */}
      {invoice.exceptions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Matching Exceptions</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded overflow-auto">
              {JSON.stringify(invoice.exceptions, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}