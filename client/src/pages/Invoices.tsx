import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Search, Eye, AlertTriangle, CheckCircle, Clock, FileText } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
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

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: invoices = [], isLoading, error } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
    queryFn: async () => {
      const response = await fetch('/api/invoices', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    },
  });

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'exception':
        return <AlertTriangle className="w-4 h-4" />;
      case 'paid':
        return <FileText className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getMatchStatusLabel = (matchStatus: string | null) => {
    if (!matchStatus) return 'Not processed';
    
    switch (matchStatus) {
      case 'matched':
        return 'Matched';
      case 'price_variance':
        return 'Price Variance';
      case 'qty_variance':
        return 'Quantity Variance';
      case 'missing_po':
        return 'Missing PO';
      case 'tax_variance':
        return 'Tax Variance';
      case 'freight_variance':
        return 'Freight Variance';
      default:
        return matchStatus;
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

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive">Failed to load invoices</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Process and match vendor invoices with 3-way verification</p>
        </div>
        <Button data-testid="button-upload-invoice">
          <Upload className="w-4 h-4 mr-2" />
          Upload Invoice
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="exception">Exception</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                {searchQuery || statusFilter !== "all" ? (
                  <p>No invoices match your filters</p>
                ) : (
                  <p>No invoices yet. Upload your first invoice to get started.</p>
                )}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Match Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50" data-testid={`invoice-row-${invoice.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(invoice.status)}
                        <span data-testid={`invoice-number-${invoice.id}`}>{invoice.invoiceNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span data-testid={`invoice-vendor-${invoice.id}`}>
                        Vendor {invoice.vendorId.slice(-4)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium" data-testid={`invoice-amount-${invoice.id}`}>
                        {invoice.totalAmount ? formatCurrency(invoice.totalAmount) : 'N/A'}
                      </span>
                      {invoice.matchVariance && parseFloat(invoice.matchVariance) !== 0 && (
                        <div className="text-xs text-red-600 dark:text-red-400">
                          Variance: {parseFloat(invoice.matchVariance) > 0 ? '+' : ''}{formatCurrency(invoice.matchVariance)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" data-testid={`invoice-date-${invoice.id}`}>
                        {invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'MMM dd, yyyy') : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {invoice.matchStatus && (
                        <Badge 
                          className={matchStatusColors[invoice.matchStatus as keyof typeof matchStatusColors] || 'bg-gray-100 text-gray-800'} 
                          data-testid={`invoice-match-status-${invoice.id}`}
                        >
                          {getMatchStatusLabel(invoice.matchStatus)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[invoice.status as keyof typeof statusColors]} data-testid={`invoice-status-${invoice.id}`}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span data-testid={`invoice-uploaded-${invoice.id}`}>
                        {formatDistanceToNow(new Date(invoice.createdAt), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild data-testid={`button-view-invoice-${invoice.id}`}>
                        <Link to={`/invoices/${invoice.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
