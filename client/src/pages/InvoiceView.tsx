import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, FileText, DollarSign, Calendar, Building, User, Link as LinkIcon, Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
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
  const [isMatchingDialogOpen, setIsMatchingDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<string>("");
  const [matchAmount, setMatchAmount] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch available POs for manual matching
  const { data: availablePOs } = useQuery({
    queryKey: ['/api/purchase-orders', { projectId: invoice?.projectId }],
    queryFn: async () => {
      const response = await fetch(`/api/purchase-orders?projectId=${invoice?.projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch purchase orders');
      return response.json();
    },
    enabled: !!invoice?.projectId,
  });

  // Manual matching mutation
  const manualMatchMutation = useMutation({
    mutationFn: async (matchData: { poId: string; amount: string }) => {
      const response = await fetch(`/api/invoices/${id}/manual-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(matchData),
      });
      if (!response.ok) throw new Error('Failed to match invoice');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      setIsMatchingDialogOpen(false);
      setSelectedPO("");
      setMatchAmount("");
      toast({
        title: "Success",
        description: "Invoice matched to purchase order successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to match invoice to purchase order",
        variant: "destructive",
      });
    },
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

  const handleManualMatch = () => {
    if (!selectedPO || !matchAmount) {
      toast({
        title: "Error",
        description: "Please select a purchase order and enter an amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(matchAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    manualMatchMutation.mutate({ poId: selectedPO, amount: matchAmount });
  };

  const hasMatchingExceptions = invoice?.exceptions && Array.isArray(invoice.exceptions) && invoice.exceptions.length > 0;

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

      {/* Manual Matching Section */}
      {hasMatchingExceptions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-red-600">Matching Exceptions</span>
              <Dialog open={isMatchingDialogOpen} onOpenChange={setIsMatchingDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-manual-match">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Manual Match
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Manual Invoice Matching</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="po-select">Select Purchase Order</Label>
                      <Select value={selectedPO} onValueChange={setSelectedPO}>
                        <SelectTrigger data-testid="select-po">
                          <SelectValue placeholder="Choose a purchase order" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePOs?.map((po: any) => (
                            <SelectItem key={po.id} value={po.id}>
                              {`PO #${po.poNumber} - ${po.vendor?.name || 'Unknown Vendor'} (${formatCurrency(po.totalAmount)})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="match-amount">Match Amount (Partial invoice allowed)</Label>
                      <Input
                        id="match-amount"
                        type="number"
                        step="0.01"
                        placeholder="Enter amount to match"
                        value={matchAmount}
                        onChange={(e) => setMatchAmount(e.target.value)}
                        data-testid="input-match-amount"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Invoice Total: {formatCurrency(invoice.totalAmount)} | 
                        Can be partial amount for partial shipments
                      </p>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsMatchingDialogOpen(false)}
                        data-testid="button-cancel-match"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleManualMatch}
                        disabled={manualMatchMutation.isPending}
                        data-testid="button-confirm-match"
                      >
                        {manualMatchMutation.isPending ? "Matching..." : "Match Invoice"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-4">
              <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">Issues Found:</h4>
              {Array.isArray(invoice.exceptions) ? (
                <ul className="space-y-2">
                  {invoice.exceptions.map((exception: any, index: number) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Badge variant="destructive" className="mt-0.5">
                        {exception.severity || 'error'}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium text-red-900 dark:text-red-100">
                          {exception.type?.replace('_', ' ').toUpperCase() || 'Unknown Issue'}
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {exception.message || 'No details available'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <pre className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-auto">
                  {JSON.stringify(invoice.exceptions, null, 2)}
                </pre>
              )}
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Manual Matching:</strong> Use the "Manual Match" button above to link this invoice to a specific purchase order. 
                You can enter a partial amount to match against partial deliveries or shipments.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Successfully Matched Information */}
      {invoice.poId && !hasMatchingExceptions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <LinkIcon className="w-5 h-5 mr-2" />
              Matched to Purchase Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded p-4">
              <p className="text-sm text-green-900 dark:text-green-100">
                This invoice has been successfully matched to Purchase Order: <code>{invoice.poId.slice(-8)}</code>
              </p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link to={`/purchase-orders/${invoice.poId}`} data-testid="link-view-po">
                  View Purchase Order
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}