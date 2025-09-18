import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit, FileText, Calendar, User, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function ChangeOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Query change order details
  const { data: changeOrder, isLoading, error } = useQuery({
    queryKey: ['/api/change-orders', id],
    queryFn: async () => {
      if (!id) throw new Error('Change Order ID is required');
      const response = await fetch(`/api/change-orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch change order details');
      return response.json();
    },
    enabled: !!id
  });

  // Query change order documents
  const { data: documents } = useQuery({
    queryKey: ['/api/change-orders', id, 'documents'],
    queryFn: async () => {
      if (!id) return [];
      const response = await fetch(`/api/change-orders/${id}/documents`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'pending_approval':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'pending_approval':
        return 'Pending Approval';
      case 'approved':
        return 'Approved';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'budget_adjustment':
        return 'Budget Adjustment';
      case 'added_scope':
        return 'Added Scope';
      default:
        return type;
    }
  };

  const getOriginatorLabel = (originator: string) => {
    switch (originator) {
      case 'rfi':
        return 'RFI';
      case 'addendum':
        return 'Addendum';
      case 'email':
        return 'Email';
      case 'owner_directive':
        return 'Owner Directive';
      case 'other':
        return 'Other';
      default:
        return originator;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !changeOrder) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive">Failed to load change order details.</p>
            <Button onClick={() => navigate('/change-orders')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Change Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/change-orders')} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{changeOrder.corNumber}</h1>
            <p className="text-muted-foreground">{changeOrder.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {changeOrder.status === 'draft' && (
            <Button 
              onClick={() => navigate(`/change-orders/${id}/edit`)}
              data-testid="button-edit-change-order"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(changeOrder.status)}>
                {getStatusLabel(changeOrder.status)}
              </Badge>
              <Badge variant="outline">
                {getTypeLabel(changeOrder.type)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="font-medium text-muted-foreground">COR Number</label>
                <p className="text-foreground">{changeOrder.corNumber}</p>
              </div>
              <div>
                <label className="font-medium text-muted-foreground">Originator</label>
                <p className="text-foreground">{getOriginatorLabel(changeOrder.originator)}</p>
              </div>
            </div>

            {changeOrder.description && (
              <div>
                <label className="font-medium text-muted-foreground">Description</label>
                <p className="text-foreground mt-1">{changeOrder.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Financial Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="font-medium text-muted-foreground">Estimated Cost</label>
                <p className="text-foreground font-semibold">
                  ${changeOrder.estimatedCost ? Number(changeOrder.estimatedCost).toFixed(2) : 'N/A'}
                </p>
              </div>
              <div>
                <label className="font-medium text-muted-foreground">Final Cost</label>
                <p className="text-foreground font-semibold">
                  ${changeOrder.finalCost ? Number(changeOrder.finalCost).toFixed(2) : 'N/A'}
                </p>
              </div>
            </div>

            {changeOrder.type === 'added_scope' && changeOrder.newScopeCode && (
              <div>
                <label className="font-medium text-muted-foreground">New Scope Cost Code</label>
                <p className="text-foreground">{changeOrder.newScopeCode}</p>
                {changeOrder.newScopeDescription && (
                  <p className="text-muted-foreground text-sm mt-1">{changeOrder.newScopeDescription}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">{new Date(changeOrder.createdAt).toLocaleDateString()}</span>
              </div>
              {changeOrder.approvedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Approved</span>
                  <span className="text-foreground">{new Date(changeOrder.approvedAt).toLocaleDateString()}</span>
                </div>
              )}
              {changeOrder.poCreatedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">PO Created</span>
                  <span className="text-foreground">{new Date(changeOrder.poCreatedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents
            </CardTitle>
            <CardDescription>
              Supporting documentation for this change order
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documents && documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{doc.filename}</p>
                      <p className="text-sm text-muted-foreground capitalize">{doc.kind}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No documents uploaded yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}