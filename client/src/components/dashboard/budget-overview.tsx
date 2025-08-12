import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { BudgetZone } from '@/types';

const mockZones: BudgetZone[] = [
  {
    id: '1',
    name: 'Zone A-1: Main Lobby',
    budget: 125000,
    committed: 98500,
    actual: 92150,
    completionPercentage: 75,
    variance: -6350
  },
  {
    id: '2',
    name: 'Zone B-3: Restrooms',
    budget: 85000,
    committed: 52300,
    actual: 38750,
    completionPercentage: 45,
    variance: -13550
  },
  {
    id: '3',
    name: 'Zone C-2: Office Areas',
    budget: 195000,
    committed: 45800,
    actual: 18900,
    completionPercentage: 20,
    variance: 26900
  }
];

export default function BudgetOverview() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Budget Overview</CardTitle>
        <Button variant="ghost" size="sm" data-testid="view-budget-details">
          View details
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockZones.map((zone) => {
          const spendPercentage = (zone.actual / zone.budget) * 100;
          const remaining = zone.budget - zone.actual;
          const isOverBudget = zone.actual > zone.budget;
          
          return (
            <div 
              key={zone.id} 
              className="border border-slate-200 rounded-lg p-4"
              data-testid={`budget-zone-${zone.id}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-900">{zone.name}</h4>
                <span className="text-sm text-slate-500">{zone.completionPercentage}% complete</span>
              </div>
              
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600">
                  Budget: <span className="font-medium">{formatCurrency(zone.budget)}</span>
                </span>
                <span className="text-slate-600">
                  Committed: <span className="font-medium">{formatCurrency(zone.committed)}</span>
                </span>
                <span className="text-slate-600">
                  Actual: <span className="font-medium">{formatCurrency(zone.actual)}</span>
                </span>
              </div>
              
              <Progress 
                value={Math.min(spendPercentage, 100)} 
                className="w-full h-2 mb-2"
              />
              
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Remaining: <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(remaining)}
                  </span>
                </span>
                <span>
                  Variance: <span className={`font-medium ${zone.variance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {zone.variance > 0 ? '+' : ''}{formatCurrency(zone.variance)}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
