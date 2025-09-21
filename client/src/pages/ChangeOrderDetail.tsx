import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, FileText, Calendar, User, DollarSign, GitBranch, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function ChangeOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for version selection
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>(undefined);

  // Query change order details (with optional version)
  const { data: changeOrder, isLoading, error } = useQuery({
    queryKey: ['/api/change-orders', id, selectedVersionId],
    queryFn: async () => {
      if (!id) throw new Error('Change Order ID is required');
      const versionParam = selectedVersionId ? `?versionId=${selectedVersionId}` : '';
      const response = await fetch(`/api/change-orders/${id}${versionParam}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch change order details');
      return response.json();
    },
    enabled: !!id
  });

  // Query version history
  const { data: versions } = useQuery({
    queryKey: ['/api/change-orders', id, 'versions'],
    queryFn: async () => {
      if (!id) return [];
      const response = await fetch(`/api/change-orders/${id}/versions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) return [];
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

  // Mutation for creating new version
  const createVersionMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Change Order ID is required');
      const response = await fetch(`/api/change-orders/${id}/versions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create new version');
      }
      return response.json();
    },
    onSuccess: (newVersion) => {
      toast({
        title: "New Version Created",
        description: `Version ${newVersion.version} has been created and is ready for editing.`,
      });
      
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['/api/change-orders', id, 'versions'] });
      
      // Navigate to the new version for editing
      setSelectedVersionId(newVersion.versionId);
      navigate(`/change-orders/${newVersion.versionId}/edit`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Version",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateNewVersion = () => {
    createVersionMutation.mutate();
  };

  // Query current user for role checking
  const { data: currentUser } = useQuery({
    queryKey: ['/api/users/me'],
    queryFn: async () => {
      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    }
  });

  // Mutation for submitting change order for approval
  const submitForApprovalMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Change Order ID is required');
      const response = await fetch(`/api/change-orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'pending_approval' }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit for approval');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Submitted for Approval",
        description: `${changeOrder?.corNumber} has been submitted for approval.`,
      });
      
      // Invalidate and refetch the change order
      queryClient.invalidateQueries({ queryKey: ['/api/change-orders', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/change-orders'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Submit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for approving change order
  const approveChangeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Change Order ID is required');
      const response = await fetch(`/api/change-orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve change order');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Change Order Approved",
        description: `${changeOrder?.corNumber} has been approved successfully.`,
      });
      
      // Invalidate and refetch the change order
      queryClient.invalidateQueries({ queryKey: ['/api/change-orders', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/change-orders'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Approve",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitForApproval = () => {
    if (window.confirm(`Are you sure you want to submit ${changeOrder?.corNumber} for approval? You will not be able to edit it after submission.`)) {
      submitForApprovalMutation.mutate();
    }
  };

  const handleApproveChangeOrder = () => {
    if (window.confirm(`Are you sure you want to approve ${changeOrder?.corNumber}? This action cannot be undone.`)) {
      approveChangeOrderMutation.mutate();
    }
  };

  // Check if user can approve (PM or Admin role)
  const canApprove = currentUser && ['PM', 'Admin'].includes(currentUser.role);

  const formatVersionDisplay = (version: number) => {
    return version === 1 ? 'v1.00' : `v1.${version.toString().padStart(2, '0')}`;
  };

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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{changeOrder.corNumber}</h1>
              {/* Version Badge */}
              <Badge variant="outline" className="text-xs">
                <GitBranch className="w-3 h-3 mr-1" />
                {formatVersionDisplay(changeOrder.currentVersion || 1)}
              </Badge>
            </div>
            <p className="text-muted-foreground">{changeOrder.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Version Dropdown */}
          {versions && versions.length > 1 && (
            <Select
              value={selectedVersionId || changeOrder.id}
              onValueChange={setSelectedVersionId}
            >
              <SelectTrigger className="w-32" data-testid="select-version">
                <SelectValue placeholder="Version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version: any) => (
                  <SelectItem key={version.id} value={version.id}>
                    {formatVersionDisplay(version.version)}
                    {version.status === 'draft' && ' (Draft)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Approve Button */}
          {canApprove && changeOrder.status === 'pending_approval' && (
            <Button
              onClick={handleApproveChangeOrder}
              disabled={approveChangeOrderMutation.isPending}
              data-testid="button-approve-change-order"
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              {approveChangeOrderMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          )}

          {/* New Version Button */}
          {changeOrder.status !== 'draft' && (
            <Button
              variant="outline"
              onClick={handleCreateNewVersion}
              disabled={createVersionMutation.isPending}
              data-testid="button-new-version"
            >
              <Plus className="w-4 h-4 mr-2" />
              {createVersionMutation.isPending ? 'Creating...' : 'New Version'}
            </Button>
          )}
          
          {/* Submit for Approval Button */}
          {changeOrder.status === 'draft' && (
            <Button
              variant="outline"
              onClick={handleSubmitForApproval}
              disabled={submitForApprovalMutation.isPending}
              data-testid="button-submit-for-approval"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Check className="w-4 h-4 mr-2" />
              {submitForApprovalMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          )}
          
          {/* Edit Button */}
          {changeOrder.status === 'draft' && (
            <Button 
              onClick={() => navigate(`/change-orders/${selectedVersionId || id}/edit`)}
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