import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Search, Eye, Package, Camera, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";

export default function Deliveries() {
  const { currentOrganization } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: deliveries, isLoading } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/deliveries`],
    enabled: !!currentOrganization?.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Received</Badge>;
      case "reconciled":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Reconciled</Badge>;
      case "discrepancy":
        return <Badge variant="destructive">Discrepancy</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "reconciled":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "discrepancy":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "received":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const filteredDeliveries = deliveries?.filter((delivery: any) =>
    delivery.packingSlipNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.po?.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deliveries</h1>
          <p className="text-slate-600">Track receipts and manage delivery confirmations</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-delivery">
              <Plus className="mr-2 h-4 w-4" />
              Record Delivery
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Delivery</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-4">
              <p className="text-muted-foreground">Delivery recording form would be implemented here with:</p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                <li>PO selection and validation</li>
                <li>Packing slip upload and OCR processing</li>
                <li>Photo capture for delivery documentation</li>
                <li>Line-by-line quantity verification</li>
                <li>Damage reporting and discrepancy notes</li>
                <li>GPS location capture</li>
                <li>Digital signature collection</li>
              </ul>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>All Deliveries</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search deliveries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-deliveries"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Package className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No deliveries found</h3>
              <p className="text-slate-600 mb-6">
                {searchTerm ? "Try adjusting your search criteria" : "Deliveries will appear here once materials are received"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Delivery
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Packing Slip</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((delivery: any) => (
                    <TableRow key={delivery.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-medium" data-testid={`delivery-${delivery.id}`}>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(delivery.status)}
                          <span>{delivery.packingSlipNumber || "No slip"}</span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`vendor-${delivery.id}`}>
                        {delivery.vendor?.name || "N/A"}
                      </TableCell>
                      <TableCell data-testid={`po-${delivery.id}`}>
                        {delivery.po?.number || "N/A"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(delivery.status)}
                      </TableCell>
                      <TableCell data-testid={`delivery-date-${delivery.id}`}>
                        {delivery.deliveryDate ? 
                          format(new Date(delivery.deliveryDate), "MMM d, yyyy") : 
                          "N/A"
                        }
                      </TableCell>
                      <TableCell data-testid={`receiver-${delivery.id}`}>
                        {delivery.receiver ? 
                          `${delivery.receiver.firstName} ${delivery.receiver.lastName}` : 
                          "N/A"
                        }
                      </TableCell>
                      <TableCell data-testid={`tracking-${delivery.id}`}>
                        {delivery.trackingNumber || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-view-${delivery.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-photos-${delivery.id}`}
                          >
                            <Camera className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {filteredDeliveries.filter((d: any) => d.status === 'received').length}
              </p>
              <p className="text-sm text-slate-600">Received</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {filteredDeliveries.filter((d: any) => d.status === 'reconciled').length}
              </p>
              <p className="text-sm text-slate-600">Reconciled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {filteredDeliveries.filter((d: any) => d.status === 'discrepancy').length}
              </p>
              <p className="text-sm text-slate-600">Discrepancies</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
