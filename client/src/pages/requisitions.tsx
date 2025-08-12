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
import { RequisitionForm } from "@/components/forms/requisition-form";
import { Plus, Search, Eye, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function Requisitions() {
  const { currentOrganization } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: requisitions, isLoading } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/requisitions`],
    enabled: !!currentOrganization?.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Submitted</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "converted":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Converted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "submitted":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const filteredRequisitions = requisitions?.filter((req: any) =>
    req.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.requester?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.requester?.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Requisitions</h1>
          <p className="text-slate-600">Manage material requests from the field</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-requisition">
              <Plus className="mr-2 h-4 w-4" />
              New Requisition
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Requisition</DialogTitle>
            </DialogHeader>
            <RequisitionForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>All Requisitions</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search requisitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-requisitions"
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
          ) : filteredRequisitions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Plus className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No requisitions found</h3>
              <p className="text-slate-600 mb-6">
                {searchTerm ? "Try adjusting your search criteria" : "Get started by creating your first requisition"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Requisition
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requisition #</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Target Delivery</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequisitions.map((requisition: any) => (
                    <TableRow key={requisition.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-medium" data-testid={`requisition-${requisition.number}`}>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(requisition.status)}
                          <span>{requisition.number}</span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`project-${requisition.id}`}>
                        {requisition.project?.name || "N/A"}
                      </TableCell>
                      <TableCell data-testid={`requester-${requisition.id}`}>
                        {requisition.requester ? 
                          `${requisition.requester.firstName} ${requisition.requester.lastName}` : 
                          "N/A"
                        }
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(requisition.status)}
                      </TableCell>
                      <TableCell data-testid={`submitted-${requisition.id}`}>
                        {requisition.submittedAt ? 
                          format(new Date(requisition.submittedAt), "MMM d, yyyy") : 
                          "-"
                        }
                      </TableCell>
                      <TableCell data-testid={`delivery-date-${requisition.id}`}>
                        {requisition.targetDeliveryDate ? 
                          format(new Date(requisition.targetDeliveryDate), "MMM d, yyyy") : 
                          "TBD"
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`button-view-${requisition.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">
                {filteredRequisitions.filter((r: any) => r.status === 'draft').length}
              </p>
              <p className="text-sm text-slate-600">Draft</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {filteredRequisitions.filter((r: any) => r.status === 'submitted').length}
              </p>
              <p className="text-sm text-slate-600">Submitted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {filteredRequisitions.filter((r: any) => r.status === 'approved').length}
              </p>
              <p className="text-sm text-slate-600">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {filteredRequisitions.filter((r: any) => r.status === 'converted').length}
              </p>
              <p className="text-sm text-slate-600">Converted</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
