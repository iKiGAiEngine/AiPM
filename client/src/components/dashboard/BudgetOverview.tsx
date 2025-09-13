import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface BudgetItem {
  id: string;
  name: string;
  budget: number;
  committed: number;
  actual: number;
  remaining: number;
  completionPercentage: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getVarianceColor = (variance: number) => {
  if (variance > 0) return 'text-green-600 dark:text-green-400';
  if (variance < 0) return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
};

const getProgressColor = (percentage: number) => {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 60) return 'bg-blue-500';
  if (percentage >= 40) return 'bg-amber-500';
  return 'bg-red-500';
};

export default function BudgetOverview() {
  const { data: budgetData, isLoading, error } = useQuery<BudgetItem[]>({
    queryKey: ['/api/dashboard/budget-overview'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/budget-overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch budget overview');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Budget Overview</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-view-budget-details">
            View details
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-2 w-full mb-2" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !budgetData) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Budget Overview</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-view-budget-details">
            View details
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load budget data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Budget Overview</CardTitle>
        <Button variant="ghost" size="sm" data-testid="button-view-budget-details">
          View details
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {budgetData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No budget data available</p>
              <p className="text-xs mt-1">Budget items will appear here once you create contract estimates</p>
            </div>
          ) : (
            budgetData.map((item) => {
              const variance = item.committed - item.actual;
              const spendPercentage = item.budget > 0 ? (item.actual / item.budget) * 100 : 0;
              
              return (
                <div 
                  key={item.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/20 transition-colors"
                  data-testid={`budget-item-${item.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground" data-testid={`item-name-${item.id}`}>
                      {item.name}
                    </h4>
                    <Badge variant="secondary" data-testid={`item-completion-${item.id}`}>
                      {item.completionPercentage}% complete
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mb-2">
                    <span className="text-muted-foreground">
                      Budget: <span className="font-medium text-foreground">{formatCurrency(item.budget)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Committed: <span className="font-medium text-foreground">{formatCurrency(item.committed)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Actual: <span className="font-medium text-foreground">{formatCurrency(item.actual)}</span>
                    </span>
                  </div>
                  
                  <div className="w-full bg-muted rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(spendPercentage)}`}
                      style={{ width: `${Math.min(spendPercentage, 100)}%` }}
                      data-testid={`item-progress-${item.id}`}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span data-testid={`item-remaining-${item.id}`}>
                      Remaining: <span className="font-medium text-blue-600 dark:text-blue-400">
                        {formatCurrency(item.remaining)}
                      </span>
                    </span>
                    <span data-testid={`item-variance-${item.id}`}>
                      Variance: <span className={`font-medium ${getVarianceColor(variance)}`}>
                        {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
