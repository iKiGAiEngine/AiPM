import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { ContractBudgetForm } from "@/components/forms/ContractBudgetForm";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, DollarSign } from "lucide-react";
import type { ContractEstimate } from "@shared/schema";

interface ContractBudgetsListProps {
  projectId: string;
}

export function ContractBudgetsList({ projectId }: ContractBudgetsListProps) {
  const [editingBudget, setEditingBudget] = useState<ContractEstimate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: budgets = [], isLoading } = useQuery<ContractEstimate[]>({
    queryKey: ["/api/projects", projectId, "contract-budgets"],
    queryFn: () => apiRequest(`/api/projects/${projectId}/contract-budgets`),
  });

  const deleteMutation = useMutation({
    mutationFn: (budgetId: string) => 
      apiRequest(`/api/contract-budgets/${budgetId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "contract-budgets"] });
      toast({ title: "Contract budget deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete contract budget", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatNumber = (amount: number | string | null) => {
    if (!amount) return '';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const totalBudget = budgets.reduce((sum, budget) => 
    sum + (parseFloat(budget.awardedValue?.toString() || '0')), 0
  );

  const handleEdit = (budget: ContractEstimate) => {
    setEditingBudget(budget);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (budgetId: string) => {
    deleteMutation.mutate(budgetId);
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingBudget(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-contract-budgets">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Contract Budgets
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total Budget: <span className="font-semibold">{formatCurrency(totalBudget)}</span>
              {budgets.length > 0 && (
                <span className="ml-2">({budgets.length} line items)</span>
              )}
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-budget">
                <Plus className="w-4 h-4 mr-2" />
                Add Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Contract Budget</DialogTitle>
              </DialogHeader>
              <ContractBudgetForm
                projectId={projectId}
                onSuccess={handleCreateSuccess}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {budgets.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-budgets-state">
            <DollarSign className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Contract Budgets</h3>
            <p className="text-muted-foreground mb-6">
              Add contract budgets to enable forecasting reports and track project financial performance.
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-first-budget">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Budget
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Contract Budget</DialogTitle>
                </DialogHeader>
                <ContractBudgetForm
                  projectId={projectId}
                  onSuccess={handleCreateSuccess}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-testid="table-contract-budgets">
              <TableHeader>
                <TableRow>
                  <TableHead>Estimate #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Cost Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Awarded Value</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((budget) => (
                  <TableRow key={budget.id} data-testid={`row-budget-${budget.id}`}>
                    <TableCell className="font-medium">
                      {budget.estimateNumber}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={budget.title}>
                        {budget.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{budget.costCode}</Badge>
                    </TableCell>
                    <TableCell>{budget.materialCategory || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(budget.awardedValue || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(budget.estimatedQuantity)}
                    </TableCell>
                    <TableCell>{budget.unit || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(budget)}
                          data-testid={`button-edit-budget-${budget.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-delete-budget-${budget.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Contract Budget</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{budget.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(budget.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contract Budget</DialogTitle>
          </DialogHeader>
          {editingBudget && (
            <ContractBudgetForm
              projectId={projectId}
              budget={editingBudget}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}