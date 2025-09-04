import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, User, MapPin, FileText, Package, Send, Edit3, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Requisition, RequisitionLine } from "@shared/schema";

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  submitted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  converted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

export default function RequisitionView() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch requisition details
  const { data: requisition, isLoading, error } = useQuery<Requisition>({
    queryKey: ['/api/requisitions', id],
    queryFn: async () => {
      const response = await fetch(`/api/requisitions/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch requisition');
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch requisition lines
  const { data: requisitionLines = [] } = useQuery<RequisitionLine[]>({
    queryKey: ['/api/requisitions', id, 'lines'],
    queryFn: async () => {
      const response = await fetch(`/api/requisitions/${id}/lines`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  // Mutation to submit draft requisition
  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/requisitions/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ status: 'submitted' }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit requisition');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requisitions', id] });
      toast({
        title: 'Success',
        description: 'Requisition submitted successfully and is now pending approval',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit requisition',
        variant: 'destructive',
      });
    },
  });

  const navigate = useNavigate();

  // Mutation to delete requisition
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/requisitions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete requisition');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requisitions'] });
      toast({
        title: 'Success',
        description: 'Requisition deleted successfully',
      });
      navigate('/requisitions');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete requisition',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (requisitionLines.length === 0) {
      toast({
        title: 'Cannot Submit',
        description: 'Please add at least one material line item before submitting',
        variant: 'destructive',
      });
      return;
    }
    submitMutation.mutate();
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleEdit = () => {
    navigate(`/requisitions/${id}/edit`);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !requisition) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive">Failed to load requisition details</p>
              <Button variant="outline" asChild className="mt-4">
                <Link to="/requisitions">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Requisitions
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCost = requisitionLines.reduce((sum, line) => sum + (Number(line.estimatedCost) || 0), 0);

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/requisitions">
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Back to Requisitions</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
            <Badge className={statusColors[requisition.status as keyof typeof statusColors]}>
              {requisition.status}
            </Badge>
          </div>
          
          {/* Action buttons for draft requisitions */}
          {requisition.status === 'draft' && (
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleEdit}
                variant="outline"
                size="sm"
                data-testid="button-edit-requisition"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    data-testid="button-delete-requisition"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Requisition</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this requisition? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button 
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-submit-requisition"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitMutation.isPending ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          )}
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{requisition.number}</h1>
          <p className="text-sm sm:text-base text-muted-foreground line-clamp-2">{requisition.title}</p>
        </div>
      </div>

      {/* Requisition Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Requisition Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Number</label>
                <p className="font-medium">{requisition.number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={statusColors[requisition.status as keyof typeof statusColors]}>
                    {requisition.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Project</label>
                <p className="capitalize">{requisition.projectId || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created By</label>
                <p className="capitalize">{requisition.requesterId || 'N/A'}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Title</label>
              <p className="mt-1">{requisition.title || 'No title provided'}</p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Created {requisition.createdAt ? formatDistanceToNow(new Date(requisition.createdAt), { addSuffix: true }) : 'Unknown'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location & Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Zone</label>
              <p className="font-medium">{requisition.zone || 'Not specified'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Target Delivery</label>
              <p>{requisition.targetDeliveryDate ? new Date(requisition.targetDeliveryDate).toLocaleDateString() : 'Not specified'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Contract Estimate</label>
              <p>{requisition.contractEstimateId || 'Not specified'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Total Estimated Cost</label>
              <p className="text-lg font-bold text-green-600">
                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="w-5 h-5" />
            Requested Materials ({requisitionLines.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {requisitionLines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No line items found for this requisition
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Est. Cost</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requisitionLines.map((line, index) => (
                      <TableRow key={line.id || index}>
                        <TableCell className="font-medium">
                          {line.description}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {line.notes || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.quantity}
                        </TableCell>
                        <TableCell>
                          {line.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.estimatedCost ? `$${Number(line.estimatedCost).toFixed(2)}` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {line.notes || 'No notes'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-3">
                {requisitionLines.map((line, index) => (
                  <Card key={line.id || index} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <h4 className="font-medium text-foreground line-clamp-2">{line.description}</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Quantity:</span>
                            <span className="ml-2 font-medium">{line.quantity} {line.unit}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Est. Cost:</span>
                            <span className="ml-2 font-medium">
                              {line.estimatedCost ? `$${Number(line.estimatedCost).toFixed(2)}` : 'N/A'}
                            </span>
                          </div>
                        </div>
                        {line.notes && (
                          <div className="pt-2 border-t">
                            <span className="text-xs text-muted-foreground">Notes:</span>
                            <p className="text-sm mt-1">{line.notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}