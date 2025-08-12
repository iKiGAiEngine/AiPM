import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, DollarSign, Package, AlertTriangle, FileText, Calendar } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Reports() {
  const { currentOrganization } = useAuth();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");

  const { data: projects } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/projects`],
    enabled: !!currentOrganization?.id,
  });

  const { data: dashboardStats } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/dashboard/stats`],
    enabled: !!currentOrganization?.id,
  });

  // Mock data for charts - in real app this would come from API
  const spendingData = [
    { month: 'Jan', amount: 45000, budget: 50000 },
    { month: 'Feb', amount: 52000, budget: 55000 },
    { month: 'Mar', amount: 48000, budget: 50000 },
    { month: 'Apr', amount: 61000, budget: 65000 },
    { month: 'May', amount: 55000, budget: 60000 },
    { month: 'Jun', amount: 67000, budget: 70000 },
  ];

  const categoryData = [
    { name: 'Restroom Accessories', value: 35, amount: 125000 },
    { name: 'Fire Protection', value: 25, amount: 89000 },
    { name: 'Lockers & Storage', value: 20, amount: 71000 },
    { name: 'Signage', value: 12, amount: 43000 },
    { name: 'Other', value: 8, amount: 28000 },
  ];

  const vendorPerformanceData = [
    { vendor: 'ABC Supply', onTime: 94, orders: 23, value: 125000 },
    { vendor: 'Bobrick Hardware', onTime: 96, orders: 18, value: 89000 },
    { vendor: 'FireSafe Systems', onTime: 88, orders: 12, value: 71000 },
    { vendor: 'Metro Lockers', onTime: 78, orders: 15, value: 43000 },
    { vendor: 'SignCraft Inc.', onTime: 92, orders: 8, value: 28000 },
  ];

  const processingMetrics = [
    { metric: 'Avg. Requisition Processing', value: '2.3 days', trend: 'down', change: '-0.5' },
    { metric: 'RFQ Response Rate', value: '87%', trend: 'up', change: '+3%' },
    { metric: 'Invoice Processing Time', value: '1.8 hours', trend: 'down', change: '-0.3' },
    { metric: '3-Way Match Success', value: '94%', trend: 'up', change: '+2%' },
  ];

  const exportReport = (reportType: string) => {
    // In real app, this would generate and download the report
    console.log(`Exporting ${reportType} report`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-600">Analytics and insights</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48" data-testid="select-project-filter">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map((project: any) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32" data-testid="select-date-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="spending" data-testid="tab-spending">Spending</TabsTrigger>
          <TabsTrigger value="vendors" data-testid="tab-vendors">Vendors</TabsTrigger>
          <TabsTrigger value="procurement" data-testid="tab-procurement">Procurement</TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Spend</p>
                    <p className="text-2xl font-bold text-slate-900">$356.2K</p>
                    <p className="text-xs text-green-600 font-medium">+12% vs last period</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Cost Savings</p>
                    <p className="text-2xl font-bold text-slate-900">$23.4K</p>
                    <p className="text-xs text-green-600 font-medium">6.6% savings rate</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Orders Placed</p>
                    <p className="text-2xl font-bold text-slate-900">147</p>
                    <p className="text-xs text-blue-600 font-medium">18 this week</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Exceptions</p>
                    <p className="text-2xl font-bold text-slate-900">5</p>
                    <p className="text-xs text-red-600 font-medium">Require attention</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Processing Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Process Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {processingMetrics.map((metric, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-600">{metric.metric}</span>
                      <Badge variant={metric.trend === 'up' ? 'default' : 'secondary'} className="text-xs">
                        {metric.change}
                      </Badge>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{metric.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Spending Trend */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Monthly Spending Trend</CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportReport('spending-trend')}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={spendingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                  <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} />
                  <Line type="monotone" dataKey="budget" stroke="#94a3b8" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spending" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Budget vs Actual */}
            <Card>
              <CardHeader>
                <CardTitle>Budget vs Actual</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={spendingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                    <Bar dataKey="budget" fill="#e2e8f0" />
                    <Bar dataKey="amount" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Category Breakdown</CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportReport('category-breakdown')}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryData.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${category.amount.toLocaleString()}</div>
                      <div className="text-sm text-slate-500">{category.value}% of total</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-6">
          {/* Vendor Performance Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Vendor Performance</CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportReport('vendor-performance')}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vendorPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vendor" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="onTime" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Vendor Scorecard */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Scorecard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendorPerformanceData.map((vendor, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium text-slate-700">
                          {vendor.vendor.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{vendor.vendor}</div>
                        <div className="text-sm text-slate-500">{vendor.orders} orders</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-green-600">{vendor.onTime}%</span>
                        <span className="text-xs text-slate-500">on-time</span>
                      </div>
                      <div className="text-sm text-slate-500">${vendor.value.toLocaleString()} value</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procurement" className="space-y-6">
          {/* Procurement Cycle Times */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">2.3</p>
                  <p className="text-sm text-slate-600">Avg. Req Processing (days)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">4.7</p>
                  <p className="text-sm text-slate-600">Avg. Quote Turnaround (days)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">1.2</p>
                  <p className="text-sm text-slate-600">Avg. PO Processing (days)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Process Status */}
          <Card>
            <CardHeader>
              <CardTitle>Process Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Pending Requisitions</p>
                      <p className="text-sm text-blue-700">Awaiting approval</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">{dashboardStats?.openRequisitions || 0}</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-900">Active RFQs</p>
                      <p className="text-sm text-amber-700">Awaiting vendor responses</p>
                    </div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800">8</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Pending Deliveries</p>
                      <p className="text-sm text-green-700">En route or scheduled</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">12</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          {/* Compliance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">94%</p>
                  <p className="text-sm text-slate-600">3-Way Match Success</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">100%</p>
                  <p className="text-sm text-slate-600">PO Authorization</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">3</p>
                  <p className="text-sm text-slate-600">Policy Exceptions</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exception Details */}
          <Card>
            <CardHeader>
              <CardTitle>Exception Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-red-900">Price Variance Exceptions</p>
                    <p className="text-sm text-red-700">2 invoices exceed tolerance limits</p>
                  </div>
                  <Badge variant="destructive">High</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-amber-200 bg-amber-50 rounded-lg">
                  <div>
                    <p className="font-medium text-amber-900">Missing PO References</p>
                    <p className="text-sm text-amber-700">1 invoice without matching PO</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800">Medium</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-blue-900">Approval Bypass</p>
                    <p className="text-sm text-blue-700">Emergency purchase processed</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Low</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
