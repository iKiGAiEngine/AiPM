import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ProjectZone {
  id: string;
  name: string;
  budget: number;
  committed: number;
  actual: number;
  completionPercentage: number;
}

// Mock data - in a real app this would come from an API
const mockZones: ProjectZone[] = [
  {
    id: '1',
    name: 'Zone A-1: Main Lobby',
    budget: 125000,
    committed: 98500,
    actual: 92150,
    completionPercentage: 75
  },
  {
    id: '2',
    name: 'Zone B-3: Restrooms',
    budget: 85000,
    committed: 52300,
    actual: 38750,
    completionPercentage: 45
  },
  {
    id: '3',
    name: 'Zone C-2: Office Areas',
    budget: 195000,
    committed: 45800,
    actual: 18900,
    completionPercentage: 20
  }
];

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
          {mockZones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No budget data available</p>
            </div>
          ) : (
            mockZones.map((zone) => {
              const remaining = zone.budget - zone.actual;
              const variance = zone.committed - zone.actual;
              const spendPercentage = (zone.actual / zone.budget) * 100;
              
              return (
                <div 
                  key={zone.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/20 transition-colors"
                  data-testid={`budget-zone-${zone.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground" data-testid={`zone-name-${zone.id}`}>
                      {zone.name}
                    </h4>
                    <Badge variant="secondary" data-testid={`zone-completion-${zone.id}`}>
                      {zone.completionPercentage}% complete
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mb-2">
                    <span className="text-muted-foreground">
                      Budget: <span className="font-medium text-foreground">{formatCurrency(zone.budget)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Committed: <span className="font-medium text-foreground">{formatCurrency(zone.committed)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Actual: <span className="font-medium text-foreground">{formatCurrency(zone.actual)}</span>
                    </span>
                  </div>
                  
                  <div className="w-full bg-muted rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(spendPercentage)}`}
                      style={{ width: `${Math.min(spendPercentage, 100)}%` }}
                      data-testid={`zone-progress-${zone.id}`}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span data-testid={`zone-remaining-${zone.id}`}>
                      Remaining: <span className="font-medium text-blue-600 dark:text-blue-400">
                        {formatCurrency(remaining)}
                      </span>
                    </span>
                    <span data-testid={`zone-variance-${zone.id}`}>
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
