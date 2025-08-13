import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Download, Send, FileText, CheckCircle, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { PurchaseOrder } from "@shared/schema";

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  acknowledged: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  received: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  closed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function PurchaseOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: purchaseOrders = [], isLoading, error } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders'],
    queryFn: async () => {
      const response = await fetch('/api/purchase-orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch purchase orders');
      return response.json();
    },
  });

  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesSearch = po.number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || po.status === statusFilter;
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
      case 'sent':
        return <Send className="w-4 h-4" />;
      case 'acknowledged':
        return <CheckCircle className="w-4 h-4" />;
      case 'received':
        return <FileText className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleDownloadPDF = async (poId: string, poNumber: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${poId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${poNumber}.pdf`;
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

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive">Failed to load purchase orders</p>
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
          <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage purchase orders and vendor communications</p>
        </div>
        <Button asChild data-testid="button-new-po">
          <Link href="/purchase-orders/new">
            <Plus className="w-4 h-4 mr-2" />
            New Purchase Order
          </Link>
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
                  placeholder="Search purchase orders..."
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      <Card>
        <CardContent className="p-0">
          {filteredPOs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                {searchQuery || statusFilter !== "all" ? (
                  <p>No purchase orders match your filters</p>
                ) : (
                  <p>No purchase orders yet. Create your first purchase order to get started.</p>
                )}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map((po) => (
                  <TableRow key={po.id} className="cursor-pointer hover:bg-muted/50" data-testid={`po-row-${po.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {po.status ? getStatusIcon(po.status) : <Clock className="w-4 h-4" />}
                        <span data-testid={`po-number-${po.id}`}>{po.number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span data-testid={`po-vendor-${po.id}`}>
                        Vendor {po.vendorId.slice(-4)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium" data-testid={`po-amount-${po.id}`}>
                        {po.totalAmount ? formatCurrency(po.totalAmount) : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" data-testid={`po-delivery-date-${po.id}`}>
                        {po.requestedDeliveryDate ? format(new Date(po.requestedDeliveryDate), 'MMM dd, yyyy') : 'Not set'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[po.status as keyof typeof statusColors]} data-testid={`po-status-${po.id}`}>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span data-testid={`po-created-${po.id}`}>
                        {po.createdAt ? formatDistanceToNow(new Date(po.createdAt), { addSuffix: true }) : 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDownloadPDF(po.id, po.number)}
                          data-testid={`button-download-pdf-${po.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" asChild data-testid={`button-view-po-${po.id}`}>
                          <Link href={`/purchase-orders/${po.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
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
