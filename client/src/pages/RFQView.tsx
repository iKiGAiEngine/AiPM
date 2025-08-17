import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Eye, FileText, Calendar, Building2, Package, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

interface RFQLine {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  estimatedCost?: number;
}

interface RFQ {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'draft' | 'sent' | 'quoted' | 'awarded' | 'cancelled';
  bidDueDate?: string;
  shipToAddress?: string;
  vendorIds: string[];
  createdAt: string;
  updatedAt: string;
  lines?: RFQLine[];
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  quoted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  awarded: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function RFQView() {
  const { id } = useParams<{ id: string }>();

  const { data: rfq, isLoading, error } = useQuery<RFQ>({
    queryKey: ['rfq', id],
    queryFn: () => fetch(`/api/rfqs/${id}`).then(res => {
      if (!res.ok) throw new Error('Failed to fetch RFQ');
      return res.json();
    }),
    enabled: !!id,
  });

  const { data: rfqLines } = useQuery<RFQLine[]>({
    queryKey: ['rfq-lines', id],
    queryFn: () => fetch(`/api/rfqs/${id}/lines`).then(res => {
      if (!res.ok) throw new Error('Failed to fetch RFQ lines');
      return res.json();
    }),
    enabled: !!id,
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => fetch('/api/vendors').then(res => res.json()),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then(res => res.json()),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">RFQ not found</p>
          <Button asChild className="mt-4">
            <Link to="/rfqs">Back to RFQs</Link>
          </Button>
        </div>
      </div>
    );
  }

  const project = projects?.find((p: any) => p.id === rfq.projectId);
  const rfqVendors = vendors?.filter((v: any) => rfq.vendorIds?.includes(v.id)) || [];
  const lines = rfqLines || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/rfqs" className="flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to RFQs
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="rfq-title">
              {rfq.title}
            </h1>
            <p className="text-muted-foreground" data-testid="rfq-id">
              RFQ #{rfq.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={statusColors[rfq.status]} data-testid="rfq-status">
            {rfq.status}
          </Badge>
          {rfq.status === 'quoted' && (
            <Button variant="outline" size="sm" asChild data-testid="button-view-quotes">
              <Link to={`/rfqs/${rfq.id}/quotes`}>
                <FileText className="w-4 h-4 mr-2" />
                View Quotes
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* RFQ Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                RFQ Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rfq.description && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Description</h4>
                  <p className="text-sm" data-testid="rfq-description">{rfq.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Bid Due Date</h4>
                  <div className="flex items-center text-sm" data-testid="rfq-due-date">
                    <Calendar className="w-4 h-4 mr-2" />
                    {rfq.bidDueDate ? format(new Date(rfq.bidDueDate), 'MMM dd, yyyy \'at\' h:mm a') : 'Not set'}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Created</h4>
                  <p className="text-sm" data-testid="rfq-created">
                    {formatDistanceToNow(new Date(rfq.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {rfq.shipToAddress && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Ship To Address</h4>
                  <p className="text-sm" data-testid="rfq-ship-address">{rfq.shipToAddress}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Line Items ({lines.length})
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No line items found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Desktop view */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-24">Quantity</TableHead>
                          <TableHead className="w-20">Unit</TableHead>
                          <TableHead className="w-32 text-right">Est. Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, index) => (
                          <TableRow key={line.id || index}>
                            <TableCell className="font-medium" data-testid={`line-description-${index}`}>
                              {line.description}
                            </TableCell>
                            <TableCell data-testid={`line-quantity-${index}`}>
                              {line.quantity}
                            </TableCell>
                            <TableCell data-testid={`line-unit-${index}`}>
                              {line.unit}
                            </TableCell>
                            <TableCell className="text-right" data-testid={`line-cost-${index}`}>
                              {line.estimatedCost ? `$${line.estimatedCost.toFixed(2)}` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile view */}
                  <div className="md:hidden space-y-4">
                    {lines.map((line, index) => (
                      <Card key={line.id || index} className="p-4">
                        <div className="space-y-2">
                          <p className="font-medium text-sm" data-testid={`mobile-line-description-${index}`}>
                            {line.description}
                          </p>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span data-testid={`mobile-line-quantity-${index}`}>
                              Qty: {line.quantity} {line.unit}
                            </span>
                            <span data-testid={`mobile-line-cost-${index}`}>
                              {line.estimatedCost ? `$${line.estimatedCost.toFixed(2)}` : 'No estimate'}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project ? (
                <div className="space-y-2">
                  <p className="font-medium" data-testid="rfq-project-name">{project.name}</p>
                  <p className="text-sm text-muted-foreground" data-testid="rfq-project-code">
                    Code: {project.code || 'N/A'}
                  </p>
                  <Button variant="outline" size="sm" asChild className="w-full mt-3">
                    <Link to={`/projects/${project.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Project
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Project not found</p>
              )}
            </CardContent>
          </Card>

          {/* Vendors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Vendors ({rfqVendors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rfqVendors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No vendors selected</p>
              ) : (
                <div className="space-y-3">
                  {rfqVendors.map((vendor: any) => (
                    <div key={vendor.id} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" data-testid={`vendor-name-${vendor.id}`}>
                          {vendor.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate" data-testid={`vendor-email-${vendor.id}`}>
                          {vendor.email || 'No email'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}