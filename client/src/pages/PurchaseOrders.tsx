import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Download, Send, FileText, CheckCircle, Clock, Edit, Trash2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useProject } from "@/contexts/ProjectContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { PurchaseOrder } from "@shared/schema";

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  pending_shipment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  pending_delivery: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  matched_pending_payment: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  received_nbs_wh: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  // Legacy statuses for backward compatibility
  acknowledged: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  received: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  closed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent to Vendor',
    pending_shipment: 'Pending Shipment',
    pending_delivery: 'In Transit',
    delivered: 'Delivered',
    matched_pending_payment: 'Invoice Matched',
    received_nbs_wh: 'In NBS Warehouse',
    // Legacy statuses
    acknowledged: 'Acknowledged',
    received: 'Received',
    closed: 'Closed'
  };
  return statusLabels[status] || status;
};

export default function PurchaseOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Check if user can edit/delete POs
  const canEdit = true; // For now, allow all authenticated users to edit POs

  const { selectedProject } = useProject();

  // Delete PO mutation
  const deleteMutation = useMutation({
    mutationFn: async (poId: string) => {
      const response = await fetch(`/api/purchase-orders/${poId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to delete purchase order');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Purchase Order Deleted',
        description: 'The purchase order has been successfully deleted.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete purchase order',
      });
    },
  });

  const { data: purchaseOrders = [], isLoading, error } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders', selectedProject?.id],
    queryFn: async () => {
      // Filter by selected project if one is selected
      const url = selectedProject ? `/api/purchase-orders?projectId=${selectedProject.id}` : '/api/purchase-orders';
      const response = await fetch(url, {
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
      case 'draft':
        return <Clock className="w-4 h-4" />;
      case 'sent':
        return <Send className="w-4 h-4" />;
      case 'pending_shipment':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending_delivery':
        return <FileText className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'matched_pending_payment':
        return <FileText className="w-4 h-4 text-purple-600" />;
      case 'received_nbs_wh':
        return <CheckCircle className="w-4 h-4 text-indigo-600" />;
      // Legacy statuses
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
          {selectedProject ? (
            <p className="text-muted-foreground">
              Project: <span className="font-medium">{selectedProject.projectNumber} - {selectedProject.name}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">All Projects - Manage purchase orders and vendor communications</p>
          )}
        </div>
        <Button asChild data-testid="button-new-po">
          <Link to="/purchase-orders/new">
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
                <SelectItem value="sent">Sent to Vendor</SelectItem>
                <SelectItem value="pending_shipment">Pending Shipment</SelectItem>
                <SelectItem value="pending_delivery">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="matched_pending_payment">Invoice Matched</SelectItem>
                <SelectItem value="received_nbs_wh">In NBS Warehouse</SelectItem>
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
                        {getStatusLabel(po.status || 'draft')}
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
                          <Link to={`/purchase-orders/${po.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        
                        {/* Edit and Delete buttons for draft/sent POs */}
                        {canEdit && ['draft', 'sent'].includes(po.status || '') && (
                          <>
                            <Button variant="ghost" size="sm" asChild data-testid={`button-edit-po-${po.id}`}>
                              <Link to={`/purchase-orders/${po.id}/edit`}>
                                <Edit className="w-4 h-4" />
                              </Link>
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  data-testid={`button-delete-po-${po.id}`}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete purchase order "{po.number}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => deleteMutation.mutate(po.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
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
