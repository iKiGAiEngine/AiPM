import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, User, MapPin, FileText, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/requisitions">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requisitions
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{requisition.number}</h1>
            <Badge className={statusColors[requisition.status as keyof typeof statusColors]}>
              {requisition.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{requisition.title}</p>
        </div>
      </div>

      {/* Requisition Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Requisition Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
          <CardTitle className="flex items-center gap-2">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}