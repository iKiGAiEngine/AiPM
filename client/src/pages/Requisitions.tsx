import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Eye, FileText, CheckCircle, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Requisition } from "@shared/schema";

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  submitted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  converted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

export default function Requisitions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requisitions = [], isLoading, error } = useQuery<Requisition[]>({
    queryKey: ['/api/requisitions'],
    queryFn: async () => {
      const response = await fetch('/api/requisitions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch requisitions');
      return response.json();
    },
  });

  const filteredRequisitions = requisitions.filter((req) => {
    const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         req.number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Check if user can approve requisitions (PM, Admin roles)
  const canApprove = user && ['PM', 'Admin'].includes(user.role);

  // Mutation for updating requisition status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/requisitions/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update requisition status');
      }
      
      return response.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/requisitions'] });
      toast({
        title: 'Success',
        description: `Requisition ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update requisition status',
        variant: 'destructive',
      });
    },
  });

  const handleApprove = (requisition: Requisition) => {
    updateStatusMutation.mutate({ id: requisition.id, status: 'approved' });
  };

  const handleReject = (requisition: Requisition) => {
    updateStatusMutation.mutate({ id: requisition.id, status: 'rejected' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'converted':
        return <FileText className="w-4 h-4" />;
      default:
        return null;
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
              <p className="text-destructive">Failed to load requisitions</p>
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
          <h1 className="text-2xl font-bold text-foreground">Requisitions</h1>
          <p className="text-muted-foreground">
            Manage material requests and approvals
            {canApprove && (() => {
              const pendingApproval = requisitions.filter(r => r.status === 'submitted').length;
              return pendingApproval > 0 ? ` • ${pendingApproval} pending approval` : '';
            })()}
          </p>
        </div>
        <Button asChild data-testid="button-new-requisition">
          <Link to="/requisitions/new">
            <Plus className="w-4 h-4 mr-2" />
            New Requisition
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
                  placeholder="Search requisitions..."
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
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requisitions Table */}
      <Card>
        <CardContent className="p-0">
          {filteredRequisitions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                {searchQuery || statusFilter !== "all" ? (
                  <p>No requisitions match your filters</p>
                ) : (
                  <p>No requisitions yet. Create your first requisition to get started.</p>
                )}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requisition</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequisitions.map((requisition) => (
                  <TableRow key={requisition.id} className="cursor-pointer hover:bg-muted/50" data-testid={`requisition-row-${requisition.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(requisition.status || '')}
                        <span data-testid={`requisition-number-${requisition.id}`}>{requisition.number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" data-testid={`requisition-title-${requisition.id}`}>
                        {requisition.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground" data-testid={`requisition-zone-${requisition.id}`}>
                        {requisition.zone || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[requisition.status as keyof typeof statusColors]} data-testid={`requisition-status-${requisition.id}`}>
                        {requisition.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span data-testid={`requisition-created-${requisition.id}`}>
                        {requisition.createdAt ? formatDistanceToNow(new Date(requisition.createdAt), { addSuffix: true }) : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild data-testid={`button-view-requisition-${requisition.id}`}>
                          <Link to={`/requisitions/${requisition.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        
                        {/* Approval Actions - only show for submitted requisitions */}
                        {canApprove && requisition.status === 'submitted' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleApprove(requisition)}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-approve-requisition-${requisition.id}`}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleReject(requisition)}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-reject-requisition-${requisition.id}`}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        
                        {/* Buyout Creation - only show for approved requisitions */}
                        {requisition.status === 'approved' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            asChild 
                            data-testid={`button-create-buyout-${requisition.id}`}
                          >
                            <Link to={`/buyout/new?requisitionId=${requisition.id}`}>
                              Create Buyout
                            </Link>
                          </Button>
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
