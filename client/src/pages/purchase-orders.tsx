import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Search, Eye, Download, Send, FileText } from "lucide-react";
import { format } from "date-fns";

export default function PurchaseOrders() {
  const { currentOrganization } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/purchase-orders`],
    enabled: !!currentOrganization?.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Sent</Badge>;
      case "acknowledged":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Acknowledged</Badge>;
      case "partial":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">Partial Delivery</Badge>;
      case "delivered":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Delivered</Badge>;
      case "invoiced":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Invoiced</Badge>;
      case "closed":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleDownloadPDF = async (poId: string) => {
    try {
      const response = await fetch(`/api/${currentOrganization?.id}/purchase-orders/${poId}/pdf`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PO-${poId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
  };

  const filteredPOs = purchaseOrders?.filter((po: any) =>
    po.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.project?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-slate-600">Manage purchase orders and vendor communications</p>
        </div>
        
        <Button data-testid="button-create-po">
          <Plus className="mr-2 h-4 w-4" />
          New PO
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>All Purchase Orders</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search purchase orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-pos"
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
          ) : filteredPOs.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No purchase orders found</h3>
              <p className="text-slate-600 mb-6">
                {searchTerm ? "Try adjusting your search criteria" : "Purchase orders will appear here once created from approved RFQs"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPOs.map((po: any) => (
                    <TableRow key={po.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-medium" data-testid={`po-${po.number}`}>
                        {po.number}
                      </TableCell>
                      <TableCell data-testid={`vendor-${po.id}`}>
                        {po.vendor?.name || "N/A"}
                      </TableCell>
                      <TableCell data-testid={`project-${po.id}`}>
                        {po.project?.name || "N/A"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(po.status)}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`total-${po.id}`}>
                        ${parseFloat(po.total || 0).toLocaleString()}
                      </TableCell>
                      <TableCell data-testid={`sent-date-${po.id}`}>
                        {po.sentAt ? 
                          format(new Date(po.sentAt), "MMM d, yyyy") : 
                          "-"
                        }
                      </TableCell>
                      <TableCell data-testid={`delivery-date-${po.id}`}>
                        {po.requestedDeliveryDate ? 
                          format(new Date(po.requestedDeliveryDate), "MMM d, yyyy") : 
                          "TBD"
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-view-${po.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownloadPDF(po.id)}
                            data-testid={`button-download-${po.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {po.status === 'draft' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-send-${po.id}`}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">
                {filteredPOs.filter((po: any) => po.status === 'draft').length}
              </p>
              <p className="text-sm text-slate-600">Draft</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {filteredPOs.filter((po: any) => po.status === 'sent').length}
              </p>
              <p className="text-sm text-slate-600">Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {filteredPOs.filter((po: any) => po.status === 'acknowledged').length}
              </p>
              <p className="text-sm text-slate-600">Acknowledged</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {filteredPOs.filter((po: any) => po.status === 'partial').length}
              </p>
              <p className="text-sm text-slate-600">Partial</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {filteredPOs.filter((po: any) => po.status === 'delivered').length}
              </p>
              <p className="text-sm text-slate-600">Delivered</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {filteredPOs.filter((po: any) => po.status === 'closed').length}
              </p>
              <p className="text-sm text-slate-600">Closed</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
