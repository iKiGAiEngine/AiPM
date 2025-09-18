import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProject } from "@/contexts/ProjectContext";

export default function ChangeOrders() {
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Query change orders for the selected project
  const { data: changeOrders, isLoading } = useQuery({
    queryKey: ['/api/change-orders', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return [];
      const response = await fetch(`/api/change-orders?projectId=${selectedProject.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch change orders');
      return response.json();
    },
    enabled: !!selectedProject
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

  const filteredChangeOrders = changeOrders?.filter((co: any) => {
    const matchesSearch = co.corNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         co.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || co.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  if (!selectedProject) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Project Selected</CardTitle>
            <CardDescription>
              Please select a project to view change orders.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Change Orders</h1>
          <p className="text-muted-foreground">
            Manage change orders for {selectedProject.name}
          </p>
        </div>
        <Button onClick={() => navigate('/change-orders/new')} data-testid="button-create-change-order">
          <Plus className="w-4 h-4 mr-2" />
          New Change Order
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search change orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Change Orders List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading change orders...</p>
          </div>
        ) : filteredChangeOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                {changeOrders?.length === 0 
                  ? "No change orders found for this project." 
                  : "No change orders match your search criteria."
                }
              </p>
              {changeOrders?.length === 0 && (
                <Button 
                  onClick={() => navigate('/change-orders/new')} 
                  className="mt-4"
                  data-testid="button-create-first-change-order"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Change Order
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredChangeOrders.map((changeOrder: any) => (
            <Card key={changeOrder.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-semibold text-lg">{changeOrder.corNumber}</h3>
                      <Badge variant={getStatusBadgeVariant(changeOrder.status)}>
                        {getStatusLabel(changeOrder.status)}
                      </Badge>
                      <Badge variant="outline">
                        {getTypeLabel(changeOrder.type)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-2">{changeOrder.title}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Final Cost: ${changeOrder.finalCost ? Number(changeOrder.finalCost).toFixed(2) : 'N/A'}
                      </span>
                      <span>
                        Created: {new Date(changeOrder.createdAt).toLocaleDateString()}
                      </span>
                      {changeOrder.approvedAt && (
                        <span>
                          Approved: {new Date(changeOrder.approvedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/change-orders/${changeOrder.id}`)}
                      data-testid={`button-view-${changeOrder.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {changeOrder.status === 'draft' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/change-orders/${changeOrder.id}/edit`)}
                        data-testid={`button-edit-${changeOrder.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}