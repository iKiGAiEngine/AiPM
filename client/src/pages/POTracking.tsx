import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Edit,
  Eye,
  MapPin,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatNumber, parseFormattedNumber } from "@/lib/number-utils";
import type { PurchaseOrder } from "@shared/schema";

interface TrackingData {
  id: string;
  estimatedLeadTimeDays?: number;
  estimatedShipmentDate?: string;
  estimatedDeliveryDate?: string;
  trackingNumber?: string;
  carrierName?: string;
  trackingStatus: string;
  actualShipDate?: string;
  deliveredAt?: string;
}

export default function POTracking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPO, setSelectedPO] = useState<(PurchaseOrder & TrackingData) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch only sent POs for tracking
  const { data: trackingPOs = [], isLoading } = useQuery<(PurchaseOrder & TrackingData)[]>({
    queryKey: ['/api/purchase-orders/tracking'],
    queryFn: async () => {
      const response = await fetch('/api/purchase-orders/tracking', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch tracking data');
      return response.json();
    },
  });

  // Update tracking mutation
  const updateTrackingMutation = useMutation({
    mutationFn: async (data: { poId: string; trackingData: Partial<TrackingData> }) => {
      const response = await fetch(`/api/purchase-orders/${data.poId}/tracking`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(data.trackingData),
      });
      if (!response.ok) throw new Error('Failed to update tracking');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Tracking Updated',
        description: 'Purchase order tracking information has been updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders/tracking'] });
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update tracking',
      });
    },
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const getTrackingStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'in_transit':
        return <Truck className="w-4 h-4 text-blue-500" />;
      case 'out_for_delivery':
        return <Package className="w-4 h-4 text-orange-500" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'exception':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrackingStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800';
      case 'out_for_delivery':
        return 'bg-orange-100 text-orange-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'exception':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEditTracking = (po: PurchaseOrder & TrackingData) => {
    setSelectedPO(po);
    setEditDialogOpen(true);
  };

  const handleSaveTracking = (formData: FormData) => {
    if (!selectedPO) return;

    const trackingData: Partial<TrackingData> = {
      estimatedLeadTimeDays: formData.get('estimatedLeadTimeDays') ? parseInt(formData.get('estimatedLeadTimeDays') as string) : undefined,
      estimatedShipmentDate: formData.get('estimatedShipmentDate') ? new Date(formData.get('estimatedShipmentDate') as string).toISOString() : undefined,
      estimatedDeliveryDate: formData.get('estimatedDeliveryDate') ? new Date(formData.get('estimatedDeliveryDate') as string).toISOString() : undefined,
      trackingNumber: formData.get('trackingNumber') as string || undefined,
      carrierName: formData.get('carrierName') as string || undefined,
      trackingStatus: formData.get('trackingStatus') as string,
      actualShipDate: formData.get('actualShipDate') ? new Date(formData.get('actualShipDate') as string).toISOString() : undefined,
    };

    updateTrackingMutation.mutate({
      poId: selectedPO.id,
      trackingData,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">PO Tracking</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading tracking data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PO Tracking</h1>
          <p className="text-muted-foreground">
            Track purchase orders that have been sent to vendors
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span>{trackingPOs.length} active shipments</span>
          </div>
        </div>
      </div>

      {/* Tracking Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          {trackingPOs.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Shipments</h3>
              <p className="text-muted-foreground">
                Purchase orders will appear here once they are sent to vendors.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Ship To</TableHead>
                  <TableHead>Tracking Status</TableHead>
                  <TableHead>Est. Delivery</TableHead>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trackingPOs.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.number}</TableCell>
                    <TableCell>{po.vendor?.name || 'Unknown'}</TableCell>
                    <TableCell>{po.project?.name || 'Unknown'}</TableCell>
                    <TableCell>{formatCurrency(po.totalAmount || 0)}</TableCell>
                    <TableCell className="max-w-32 truncate">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        {po.shipToAddress || 'Not specified'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTrackingStatusColor(po.trackingStatus)}>
                        <div className="flex items-center gap-1">
                          {getTrackingStatusIcon(po.trackingStatus)}
                          {po.trackingStatus.replace('_', ' ')}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {formatDate(po.estimatedDeliveryDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {po.trackingNumber ? (
                        <span className="font-mono text-sm">{po.trackingNumber}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">No tracking #</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTracking(po)}
                          data-testid={`button-edit-tracking-${po.id}`}
                        >
                          <Edit className="w-4 h-4" />
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

      {/* Edit Tracking Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Update Tracking - {selectedPO?.number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPO && (
            <form action={handleSaveTracking} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimatedLeadTimeDays">Lead Time (Days)</Label>
                  <Input
                    id="estimatedLeadTimeDays"
                    name="estimatedLeadTimeDays"
                    type="number"
                    min="0"
                    defaultValue={selectedPO.estimatedLeadTimeDays || ''}
                    placeholder="e.g., 14"
                    data-testid="input-lead-time"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="estimatedShipmentDate">Estimated Ship Date</Label>
                  <Input
                    id="estimatedShipmentDate"
                    name="estimatedShipmentDate"
                    type="date"
                    defaultValue={selectedPO.estimatedShipmentDate ? new Date(selectedPO.estimatedShipmentDate).toISOString().split('T')[0] : ''}
                    data-testid="input-ship-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedDeliveryDate">Estimated Delivery Date</Label>
                  <Input
                    id="estimatedDeliveryDate"
                    name="estimatedDeliveryDate"
                    type="date"
                    defaultValue={selectedPO.estimatedDeliveryDate ? new Date(selectedPO.estimatedDeliveryDate).toISOString().split('T')[0] : ''}
                    data-testid="input-delivery-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actualShipDate">Actual Ship Date</Label>
                  <Input
                    id="actualShipDate"
                    name="actualShipDate"
                    type="date"
                    defaultValue={selectedPO.actualShipDate ? new Date(selectedPO.actualShipDate).toISOString().split('T')[0] : ''}
                    data-testid="input-actual-ship-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="carrierName">Carrier</Label>
                  <Select name="carrierName" defaultValue={selectedPO.carrierName || ''}>
                    <SelectTrigger data-testid="select-carrier">
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No carrier</SelectItem>
                      <SelectItem value="FedEx">FedEx</SelectItem>
                      <SelectItem value="UPS">UPS</SelectItem>
                      <SelectItem value="USPS">USPS</SelectItem>
                      <SelectItem value="DHL">DHL</SelectItem>
                      <SelectItem value="Freight">Freight</SelectItem>
                      <SelectItem value="Vendor Delivery">Vendor Delivery</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trackingNumber">Tracking Number</Label>
                  <Input
                    id="trackingNumber"
                    name="trackingNumber"
                    defaultValue={selectedPO.trackingNumber || ''}
                    placeholder="Enter tracking number"
                    data-testid="input-tracking-number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trackingStatus">Tracking Status</Label>
                <Select name="trackingStatus" defaultValue={selectedPO.trackingStatus || 'pending'}>
                  <SelectTrigger data-testid="select-tracking-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="exception">Exception</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Ship To Address</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedPO.shipToAddress || 'No address specified'}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-cancel-tracking"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateTrackingMutation.isPending}
                  data-testid="button-save-tracking"
                >
                  {updateTrackingMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}