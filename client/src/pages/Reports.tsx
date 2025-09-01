import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  Download, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Building, 
  AlertTriangle,
  Calendar,
  FileText,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Mock data - in a real app this would come from APIs
const mockSpendingData = [
  { month: 'Jan', amount: 45000, budget: 50000 },
  { month: 'Feb', amount: 38000, budget: 45000 },
  { month: 'Mar', amount: 52000, budget: 55000 },
  { month: 'Apr', amount: 41000, budget: 48000 },
  { month: 'May', amount: 48000, budget: 50000 },
  { month: 'Jun', amount: 55000, budget: 60000 },
];

const mockCategorySpending = [
  { name: 'Toilet Accessories', value: 125000, percentage: 35 },
  { name: 'Fire Protection', value: 89000, percentage: 25 },
  { name: 'Lockers', value: 78000, percentage: 22 },
  { name: 'General Materials', value: 45000, percentage: 13 },
  { name: 'Other', value: 18000, percentage: 5 },
];

const mockVendorPerformance = [
  { name: 'ABC Supply', onTime: 94, orders: 45, totalValue: 125000 },
  { name: 'Bobrick Hardware', onTime: 96, orders: 38, totalValue: 98000 },
  { name: 'FireSafe Systems', onTime: 88, orders: 28, totalValue: 87000 },
  { name: 'Metro Lockers', onTime: 78, orders: 22, totalValue: 65000 },
];

const mockProjectMetrics = [
  { name: 'Metro Plaza', budget: 2500000, spent: 1875000, variance: -125000, completion: 75 },
  { name: 'Riverside Medical', budget: 1800000, spent: 1260000, variance: 90000, completion: 70 },
];

export default function Reports() {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("6months");
  const { projects } = useProject();

  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights into procurement performance and costs</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" data-testid="button-export-report">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Access to Specialized Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <FileText className="w-5 h-5 mr-2" />
              Contract Forecasting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              CMiC-style contract forecasting with budget tracking, cost overrides, and profit analysis
            </p>
            <div className="space-y-2">
              {projects.slice(0, 3).map((project) => (
                <Link
                  key={project.id}
                  to={`/reports/contract-forecasting/${project.id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted text-sm"
                  data-testid={`link-forecasting-${project.id}`}
                >
                  <span>{project.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Building className="w-5 h-5 mr-2" />
              Vendor Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Detailed vendor scoring, delivery performance, and cost analysis
            </p>
            <p className="text-xs text-muted-foreground italic">Coming soon...</p>
          </CardContent>
        </Card>
        
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <TrendingUp className="w-5 h-5 mr-2" />
              Cost Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Advanced cost breakdowns, variance analysis, and savings identification
            </p>
            <p className="text-xs text-muted-foreground italic">Coming soon...</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-project-filter">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="metro-plaza">Metro Plaza Office Tower</SelectItem>
                <SelectItem value="riverside-medical">Riverside Medical Center</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-time-range">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spend</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-total-spend">
                  $1,247,500
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                  +12.3% vs last period
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cost Savings</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-cost-savings">
                  $23,400
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                  1.9% of total spend
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Vendors</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-active-vendors">
                  24
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  95.8% on-time delivery
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Exception Rate</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-exception-rate">
                  2.1%
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  8 invoices this month
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Spending Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockSpendingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} name="Actual" />
                <Line type="monotone" dataKey="budget" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Budget" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockCategorySpending}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mockCategorySpending.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="w-5 h-5 mr-2" />
            Vendor Performance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-foreground">Vendor</th>
                  <th className="text-center py-3 px-4 font-medium text-foreground">Orders</th>
                  <th className="text-center py-3 px-4 font-medium text-foreground">Total Value</th>
                  <th className="text-center py-3 px-4 font-medium text-foreground">On-Time %</th>
                  <th className="text-center py-3 px-4 font-medium text-foreground">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockVendorPerformance.map((vendor, index) => (
                  <tr key={vendor.name} className="hover:bg-muted/50" data-testid={`vendor-performance-row-${index}`}>
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{vendor.name}</div>
                    </td>
                    <td className="py-3 px-4 text-center">{vendor.orders}</td>
                    <td className="py-3 px-4 text-center font-medium">{formatCurrency(vendor.totalValue)}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge 
                        className={vendor.onTime >= 95 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                  vendor.onTime >= 85 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}
                      >
                        {vendor.onTime}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < Math.floor(vendor.onTime / 20) ? 'bg-yellow-400' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Project Budget Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Project Budget Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {mockProjectMetrics.map((project, index) => {
              const spentPercentage = (project.spent / project.budget) * 100;
              const isOverBudget = project.variance < 0;
              
              return (
                <div key={project.name} className="space-y-3" data-testid={`project-budget-${index}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">{project.name}</h4>
                    <div className="flex items-center space-x-4">
                      <Badge variant="secondary">{project.completion}% complete</Badge>
                      <Badge 
                        className={isOverBudget ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'}
                      >
                        {isOverBudget ? 'Over Budget' : 'Under Budget'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Budget</div>
                      <div className="font-medium">{formatCurrency(project.budget)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Spent</div>
                      <div className="font-medium">{formatCurrency(project.spent)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Remaining</div>
                      <div className="font-medium">{formatCurrency(project.budget - project.spent)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Variance</div>
                      <div className={`font-medium ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {project.variance >= 0 ? '+' : ''}{formatCurrency(project.variance)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        spentPercentage > 100 ? 'bg-red-500' : 
                        spentPercentage > 90 ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{spentPercentage.toFixed(1)}% of budget spent</span>
                    <span>Target: {project.completion}% completion</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
