import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Download, 
  Save, 
  Settings, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

interface ForecastSummary {
  totalBudget: number;
  totalSpent: number;
  totalCommitted: number;
  totalPendingCos: number;
  totalEtc: number;
  totalProjectedCost: number;
  totalRevenueForcast: number;
  totalProfitVariance: number;
  overallCompletion: number;
}

interface CostCodeForecast {
  costCode: string;
  description: string;
  currentBudget: number;
  spent: number;
  committed: number;
  spentCommitted: number;
  pendingCos: number;
  etc: number;
  projectedCost: number;
  revenueForcast: number;
  profitVariance: number;
  percentComplete: number;
  status: 'on_track' | 'over_budget';
}

interface ContractForecastData {
  project: {
    id: string;
    name: string;
    status: string;
  };
  summary: ForecastSummary;
  costCodes: CostCodeForecast[];
}

export default function ContractForecasting() {
  const { projectId } = useParams<{ projectId: string }>();
  const { projects } = useProject();
  const [includePending, setIncludePending] = useState(true);
  const [revenueMethod, setRevenueMethod] = useState('PERCENT_COMPLETE');

  // Get forecasting data
  const { data: forecastData, isLoading } = useQuery<ContractForecastData>({
    queryKey: [`/api/reporting/contract-forecasting/${projectId}?includePending=${includePending}&revenueMethod=${revenueMethod}`],
    enabled: !!projectId,
  });

  // Find current project
  const currentProject = projects.find(p => p.id === projectId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusBadge = (status: string, variance: number) => {
    if (variance >= 0) {
      return <Badge variant="default" className="bg-green-100 text-green-800">On Track</Badge>;
    } else {
      return <Badge variant="destructive">Over Budget</Badge>;
    }
  };

  const handleExportCSV = () => {
    window.open(`/api/reporting/contract-forecasting/${projectId}/export.csv`, '_blank');
  };

  const handleSnapshot = async () => {
    try {
      const response = await fetch(`/api/reporting/contract-forecasting/${projectId}/snapshot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.ok) {
        // Show success message
        console.log('Snapshot created successfully');
      }
    } catch (error) {
      console.error('Failed to create snapshot:', error);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading contract forecasting data...</div>;
  }

  if (!forecastData) {
    return <div className="p-6">No forecasting data available for this project.</div>;
  }

  const { summary, costCodes } = forecastData;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contract Forecasting</h1>
          <p className="text-muted-foreground">
            Project: {currentProject?.name || forecastData.project.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleSnapshot} data-testid="button-snapshot">
            <Save className="w-4 h-4 mr-2" />
            Archive Snapshot
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-pending"
                checked={includePending}
                onCheckedChange={setIncludePending}
                data-testid="switch-include-pending"
              />
              <Label htmlFor="include-pending">Include Pending COs</Label>
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="revenue-method">Revenue Method:</Label>
              <Select value={revenueMethod} onValueChange={setRevenueMethod}>
                <SelectTrigger className="w-48" data-testid="select-revenue-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT_COMPLETE">% Complete</SelectItem>
                  <SelectItem value="RATE">Full Contract Value</SelectItem>
                  <SelectItem value="MANUAL">Manual Override</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {revenueMethod === 'PERCENT_COMPLETE' && 'Revenue recognized based on work completion percentage'}
                {revenueMethod === 'RATE' && 'Shows full contract value potential for each cost code'}
                {revenueMethod === 'MANUAL' && 'Allows manual revenue adjustments (full value for now)'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(summary.overallCompletion)}</div>
            <p className="text-xs text-muted-foreground">Project Progress</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">Current Cost Budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projected Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalProjectedCost)}</div>
            <p className="text-xs text-muted-foreground">Including Pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Profit/Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.totalProfitVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.totalProfitVariance)}
            </div>
            <div className="flex items-center text-xs">
              {summary.totalProfitVariance >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1 text-red-600" />
              )}
              <span className="text-muted-foreground">Revenue - Projected</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Code Forecasting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cost Code / Category</TableHead>
                  <TableHead className="text-right">Current Budget</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Committed</TableHead>
                  <TableHead className="text-right">Spent + Committed</TableHead>
                  <TableHead className="text-right">Pending COs</TableHead>
                  <TableHead className="text-right">ETC</TableHead>
                  <TableHead className="text-right">Projected Cost</TableHead>
                  <TableHead className="text-right">Revenue Forecast</TableHead>
                  <TableHead className="text-right">Profit/Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">⚙️</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costCodes.map((row, index) => (
                  <TableRow key={`${row.costCode}-${index}`} data-testid={`row-cost-code-${row.costCode}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{row.costCode}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {row.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(row.currentBudget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.spent)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.committed)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.spentCommitted)}</TableCell>
                    <TableCell className="text-right">
                      {includePending ? formatCurrency(row.pendingCos) : '-'}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(row.etc)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.projectedCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.revenueForcast)}</TableCell>
                    <TableCell className={`text-right ${row.profitVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(row.profitVariance)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(row.status, row.profitVariance)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" data-testid={`button-override-${row.costCode}`}>
                        <Settings className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}