import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Building, 
  MapPin, 
  DollarSign, 
  Calendar,
  Tag,
  Eye,
  Edit,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  AlertTriangle,
  ShoppingCart,
  Package,
  Truck,
  Receipt,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3
} from "lucide-react";
import type { Project } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

const statusColors = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", 
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  converted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  sent: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  quoted: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  closed: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  acknowledged: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  received: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  complete: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  damaged: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  exception: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  paid: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  matched: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  missing_po: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  price_variance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  qty_variance: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
};

interface ProjectSummaryData {
  requisitions: { total: number; byStatus: Record<string, number> };
  purchaseOrders: { total: number; totalValue: number; byStatus: Record<string, number> };
  deliveries: { total: number; byStatus: Record<string, number> };
  invoices: { total: number; totalValue: number; byStatus: Record<string, number>; byMatchStatus: Record<string, number> };
  financial: {
    budgetUsed: number;
    committed: number;
    invoiced: number;
    paid: number;
  };
}

function ProjectSummaryCard({ title, value, subtitle, icon: Icon, trend, trendValue }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {trend && (
            <div className={`flex items-center space-x-1 ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : 
               trend === 'down' ? <TrendingDown className="h-4 w-4" /> : 
               <Activity className="h-4 w-4" />}
              <span className="text-sm font-medium">{trendValue}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBreakdownCard({ title, data, icon: Icon }: {
  title: string;
  data: Record<string, number>;
  icon: any;
}) {
  const total = Object.values(data).reduce((sum, count) => sum + count, 0);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(data).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                  {status.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {total > 0 ? Math.round((count / total) * 100) : 0}%
                </span>
              </div>
              <span className="font-medium">{count}</span>
            </div>
          ))}
          {total === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No {title.toLowerCase()} yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectHealthIndicator({ summary }: { summary: ProjectSummaryData }) {
  // Calculate project health score based on various factors
  const requisitionCompletionRate = summary.requisitions.total > 0 
    ? (summary.requisitions.byStatus.converted || 0) / summary.requisitions.total * 100 
    : 0;
  
  const deliveryCompletionRate = summary.deliveries.total > 0
    ? (summary.deliveries.byStatus.complete || 0) / summary.deliveries.total * 100
    : 0;
    
  const invoiceMatchRate = summary.invoices.total > 0
    ? (summary.invoices.byMatchStatus.matched || 0) / summary.invoices.total * 100
    : 100; // No issues if no invoices
  
  const overallHealth = (requisitionCompletionRate + deliveryCompletionRate + invoiceMatchRate) / 3;
  
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };
  
  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Attention';
    return 'Critical';
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Project Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(overallHealth)}`}>
            {getHealthLabel(overallHealth)} ({Math.round(overallHealth)}%)
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Requisition Flow</span>
              <span>{Math.round(requisitionCompletionRate)}%</span>
            </div>
            <Progress value={requisitionCompletionRate} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Delivery Progress</span>
              <span>{Math.round(deliveryCompletionRate)}%</span>
            </div>
            <Progress value={deliveryCompletionRate} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Invoice Matching</span>
              <span>{Math.round(invoiceMatchRate)}%</span>
            </div>
            <Progress value={invoiceMatchRate} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isValidId = (val?: string) =>
    !!val && 
    val !== 'projects' && 
    /^[0-9a-fA-F-]{36}$/.test(val);

  useEffect(() => {
    if (!isValidId(id)) {
      navigate("/projects", { replace: true });
    }
  }, [id, navigate]);

  if (!isValidId(id)) {
    return null;
  }

  const { data: project, isLoading: projectLoading, error } = useQuery<Project>({
    queryKey: ['/api/projects', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch project summary data
  const { data: summary, isLoading: summaryLoading } = useQuery<ProjectSummaryData>({
    queryKey: ['/api/projects', id, 'summary'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}/summary`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch project summary');
      return response.json();
    },
    enabled: !!id,
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (projectLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Project Not Found</h2>
            <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => navigate("/projects")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const budgetUsed = summary?.financial.budgetUsed || 0;
  const budgetTotal = project.budget ? parseFloat(project.budget.toString()) : 0;
  const budgetUtilization = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/projects")}
          data-testid="button-back-to-projects"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
            <Badge className={statusColors[project.status as keyof typeof statusColors]}>
              {project.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">Comprehensive Project Management Dashboard</p>
        </div>
        <Button asChild data-testid="button-edit-project">
          <Link to={`/projects/${project.id}/edit`}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Project
          </Link>
        </Button>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProjectSummaryCard
          title="Total Budget"
          value={formatCurrency(budgetTotal)}
          subtitle={`${budgetUtilization.toFixed(1)}% utilized`}
          icon={DollarSign}
          trend={budgetUtilization > 80 ? 'up' : budgetUtilization > 50 ? 'neutral' : 'down'}
          trendValue={`${formatCurrency(budgetUsed)} used`}
        />
        
        <ProjectSummaryCard
          title="Purchase Orders"
          value={summary?.purchaseOrders.total || 0}
          subtitle={formatCurrency(summary?.purchaseOrders.totalValue || 0)}
          icon={ShoppingCart}
          trend="neutral"
          trendValue={`${Object.values(summary?.purchaseOrders.byStatus || {}).filter(status => ['sent', 'acknowledged'].includes(status)).reduce((a, b) => a + b, 0)} active`}
        />
        
        <ProjectSummaryCard
          title="Deliveries"
          value={summary?.deliveries.total || 0}
          subtitle={`${summary?.deliveries.byStatus.complete || 0} complete`}
          icon={Truck}
          trend="up"
          trendValue={`${summary?.deliveries.byStatus.pending || 0} pending`}
        />
        
        <ProjectSummaryCard
          title="Invoices"
          value={summary?.invoices.total || 0}
          subtitle={formatCurrency(summary?.invoices.totalValue || 0)}
          icon={Receipt}
          trend={summary?.invoices.byMatchStatus.exception > 0 ? 'down' : 'up'}
          trendValue={`${summary?.invoices.byMatchStatus.matched || 0} matched`}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="procurement">Procurement</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project Information */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Project Name</label>
                      <p className="font-medium">{project.name}</p>
                    </div>
                    {project.client && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Client</label>
                        <p className="text-sm">{project.client}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="mt-1">
                        <Badge className={statusColors[project.status as keyof typeof statusColors]}>
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {project.address && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Address</label>
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-sm">{project.address}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Created</label>
                      <p className="text-sm">
                        {project.createdAt ? formatDistanceToNow(new Date(project.createdAt), { addSuffix: true }) : 'Recently'}
                      </p>
                    </div>
                    {project.costCodes && project.costCodes.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Cost Codes</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {project.costCodes.slice(0, 3).map((code, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {code}
                            </Badge>
                          ))}
                          {project.costCodes.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{project.costCodes.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Budget Progress Bar */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-muted-foreground">Budget Utilization</label>
                    <span className="text-sm font-medium">{budgetUtilization.toFixed(1)}%</span>
                  </div>
                  <Progress value={budgetUtilization} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Used: {formatCurrency(budgetUsed)}</span>
                    <span>Total: {formatCurrency(budgetTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Health */}
            {!summaryLoading && summary && <ProjectHealthIndicator summary={summary} />}
          </div>

          {/* Status Breakdown Cards */}
          {!summaryLoading && summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatusBreakdownCard
                title="Requisitions"
                data={summary.requisitions.byStatus}
                icon={FileSpreadsheet}
              />
              <StatusBreakdownCard
                title="Purchase Orders"
                data={summary.purchaseOrders.byStatus}
                icon={ShoppingCart}
              />
              <StatusBreakdownCard
                title="Deliveries"
                data={summary.deliveries.byStatus}
                icon={Truck}
              />
              <StatusBreakdownCard
                title="Invoice Matching"
                data={summary.invoices.byMatchStatus}
                icon={Receipt}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="procurement" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center space-y-2"
              asChild
            >
              <Link to={`/requisitions?projectId=${project.id}`}>
                <FileSpreadsheet className="w-6 h-6" />
                <span className="text-sm">Requisitions</span>
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center space-y-2"
              asChild
            >
              <Link to={`/rfqs?projectId=${project.id}`}>
                <Users className="w-6 h-6" />
                <span className="text-sm">RFQs</span>
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center space-y-2"
              asChild
            >
              <Link to={`/purchase-orders?projectId=${project.id}`}>
                <ShoppingCart className="w-6 h-6" />
                <span className="text-sm">Purchase Orders</span>
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center space-y-2"
              asChild
            >
              <Link to={`/deliveries?projectId=${project.id}`}>
                <Truck className="w-6 h-6" />
                <span className="text-sm">Deliveries</span>
              </Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Budget</span>
                    <span className="font-medium">{formatCurrency(budgetTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Committed (POs)</span>
                    <span className="font-medium">{formatCurrency(summary?.financial.committed || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoiced</span>
                    <span className="font-medium">{formatCurrency(summary?.financial.invoiced || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="font-medium">{formatCurrency(summary?.financial.paid || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <span className="font-medium">Remaining Budget</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(budgetTotal - (summary?.financial.committed || 0))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center space-y-2"
              asChild
            >
              <Link to={`/invoices?projectId=${project.id}`}>
                <Receipt className="w-6 h-6" />
                <span className="text-sm">View Invoices</span>
              </Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center space-y-2"
              onClick={() => navigate(`/deliveries?projectId=${project.id}`)}
            >
              <Truck className="w-6 h-6" />
              <span className="text-sm">Track Deliveries</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center space-y-2"
              onClick={() => navigate(`/reports?projectId=${project.id}`)}
            >
              <BarChart3 className="w-6 h-6" />
              <span className="text-sm">Reports</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center space-y-2"
              onClick={() => navigate(`/vendors?projectId=${project.id}`)}
            >
              <Users className="w-6 h-6" />
              <span className="text-sm">Vendors</span>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center space-y-2"
              asChild
            >
              <Link to={`/projects/${project.id}/materials/upload`}>
                <Upload className="w-6 h-6" />
                <span className="text-sm">Upload Materials</span>
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center space-y-2"
              onClick={() => navigate(`/materials?projectId=${project.id}`)}
            >
              <Package className="w-6 h-6" />
              <span className="text-sm">View Materials</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center space-y-2"
              onClick={() => navigate(`/requisitions/new?projectId=${project.id}`)}
            >
              <FileSpreadsheet className="w-6 h-6" />
              <span className="text-sm">New Requisition</span>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}