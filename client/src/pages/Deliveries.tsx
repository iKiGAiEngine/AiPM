import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Truck, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { Delivery } from "@shared/schema";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  partial: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  complete: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  damaged: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function Deliveries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: deliveries = [], isLoading, error } = useQuery<Delivery[]>({
    queryKey: ['/api/deliveries'],
    queryFn: async () => {
      const response = await fetch('/api/deliveries', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch deliveries');
      return response.json();
    },
  });

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch = (delivery.packingSlipNumber?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (delivery.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || delivery.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-4 h-4" />;
      case 'partial':
        return <Package className="w-4 h-4" />;
      case 'damaged':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Truck className="w-4 h-4" />;
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
              <p className="text-destructive">Failed to load deliveries</p>
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
          <h1 className="text-2xl font-bold text-foreground">Deliveries</h1>
          <p className="text-muted-foreground">Track and manage material deliveries</p>
        </div>
        <Button asChild data-testid="button-new-delivery">
          <Link to="/deliveries/new">
            <Plus className="w-4 h-4 mr-2" />
            Record Delivery
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
                  placeholder="Search by packing slip or tracking number..."
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
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries Table */}
      <Card>
        <CardContent className="p-0">
          {filteredDeliveries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                {searchQuery || statusFilter !== "all" ? (
                  <p>No deliveries match your filters</p>
                ) : (
                  <p>No deliveries recorded yet. Record your first delivery to track materials.</p>
                )}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Packing Slip</TableHead>
                  <TableHead>Tracking Number</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recorded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.map((delivery) => (
                  <TableRow key={delivery.id} className="cursor-pointer hover:bg-muted/50" data-testid={`delivery-row-${delivery.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(delivery.status || 'pending')}
                        <span data-testid={`delivery-date-${delivery.id}`}>
                          {delivery.deliveryDate ? format(new Date(delivery.deliveryDate), 'MMM dd, yyyy') : 'Not set'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span data-testid={`delivery-vendor-${delivery.id}`}>
                        Vendor {delivery.vendorId.slice(-4)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono" data-testid={`delivery-packing-slip-${delivery.id}`}>
                        {delivery.packingSlipNumber || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono" data-testid={`delivery-tracking-${delivery.id}`}>
                        {delivery.trackingNumber || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" data-testid={`delivery-receiver-${delivery.id}`}>
                        User {delivery.receiverId.slice(-4)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[delivery.status as keyof typeof statusColors]} data-testid={`delivery-status-${delivery.id}`}>
                        {delivery.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span data-testid={`delivery-recorded-${delivery.id}`}>
                        {delivery.createdAt ? formatDistanceToNow(new Date(delivery.createdAt), { addSuffix: true }) : 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild data-testid={`button-view-delivery-${delivery.id}`}>
                        <Link to={`/deliveries/${delivery.id}`}>
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
