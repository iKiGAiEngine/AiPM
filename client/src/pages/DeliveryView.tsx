import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Truck, Package, AlertTriangle, CheckCircle, Calendar, User, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  partial: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  complete: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  damaged: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function DeliveryView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: delivery, isLoading, error } = useQuery({
    queryKey: [`/api/deliveries/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/deliveries/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch delivery");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: deliveryLines = [] } = useQuery({
    queryKey: [`/api/deliveries/${id}/lines`],
    queryFn: async () => {
      const response = await fetch(`/api/deliveries/${id}/lines`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch delivery lines");
      return response.json();
    },
    enabled: !!id,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'partial':
        return <Package className="w-5 h-5 text-blue-600" />;
      case 'damaged':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Truck className="w-5 h-5 text-yellow-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-48 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive">Failed to load delivery details</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/deliveries')}>
                Back to Deliveries
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/deliveries">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deliveries
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          {getStatusIcon(delivery.status || 'pending')}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Delivery Details</h1>
            <p className="text-muted-foreground">
              Recorded on {delivery.createdAt ? format(new Date(delivery.createdAt), 'PPP') : 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Delivery Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Delivery Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <Badge className={statusColors[delivery.status as keyof typeof statusColors]}>
              {delivery.status}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Delivery Date
            </p>
            <p className="font-medium">
              {delivery.deliveryDate ? format(new Date(delivery.deliveryDate), 'PPP') : 'Not set'}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <User className="w-4 h-4" />
              Received By
            </p>
            <p className="font-medium">User {delivery.receiverId?.slice(-4) || 'Unknown'}</p>
          </div>
          
          {delivery.packingSlipNumber && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Packing Slip
              </p>
              <p className="font-mono text-sm">{delivery.packingSlipNumber}</p>
            </div>
          )}
          
          {delivery.trackingNumber && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Tracking Number</p>
              <p className="font-mono text-sm">{delivery.trackingNumber}</p>
            </div>
          )}
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Vendor</p>
            <p className="font-medium">Vendor {delivery.vendorId?.slice(-4) || 'Unknown'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {delivery.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{delivery.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Delivery Lines */}
      <Card>
        <CardHeader>
          <CardTitle>Delivered Items</CardTitle>
        </CardHeader>
        <CardContent>
          {deliveryLines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No items recorded for this delivery</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Ordered</TableHead>
                  <TableHead className="text-center">Received</TableHead>
                  <TableHead className="text-center">Damaged</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryLines.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.description}</TableCell>
                    <TableCell className="text-center font-mono">
                      {line.quantityOrdered || '-'}
                    </TableCell>
                    <TableCell className="text-center font-mono font-medium">
                      {line.quantityReceived}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {line.quantityDamaged || 0}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">
                        {line.discrepancyNotes || '-'}
                      </p>
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