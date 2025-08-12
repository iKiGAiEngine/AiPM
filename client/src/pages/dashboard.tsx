import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { 
  ClipboardList, 
  FileText, 
  AlertTriangle, 
  TrendingUp,
  Plus,
  Calendar,
  Upload,
  BarChart3,
  CheckCircle,
  Clock,
  Package
} from "lucide-react";

export default function Dashboard() {
  const { user, currentOrganization } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/dashboard/stats`],
    enabled: !!currentOrganization?.id,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/dashboard/activity`],
    enabled: !!currentOrganization?.id,
  });

  const { data: projects } = useQuery({
    queryKey: [`/api/${currentOrganization?.id}/projects`],
    enabled: !!currentOrganization?.id,
  });

  const currentProject = projects?.[0]; // For demo, use first project

  if (statsLoading) {
    return (
      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-slate-600 mt-1">
          {currentProject?.name || "No active project"}
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Open Requisitions</p>
                <p className="text-2xl font-bold text-slate-900" data-testid="stat-requisitions">
                  {stats?.openRequisitions || 0}
                </p>
                <p className="text-xs text-green-600 font-medium">+3 this week</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending POs</p>
                <p className="text-2xl font-bold text-slate-900" data-testid="stat-pos">
                  {stats?.pendingPOs?.count || 0}
                </p>
                <p className="text-xs text-amber-600 font-medium">
                  ${(stats?.pendingPOs?.total || 0).toLocaleString()}K total
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Invoice Exceptions</p>
                <p className="text-2xl font-bold text-slate-900" data-testid="stat-exceptions">
                  {stats?.invoiceExceptions || 0}
                </p>
                <p className="text-xs text-red-600 font-medium">Needs attention</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Cost Savings</p>
                <p className="text-2xl font-bold text-slate-900" data-testid="stat-savings">
                  ${(stats?.costSavings || 0).toLocaleString()}
                </p>
                <p className="text-xs text-green-600 font-medium">This month</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => setLocation("/requisitions")}
              className="w-full justify-start bg-primary-50 text-primary-700 hover:bg-primary-100"
              variant="ghost"
              data-testid="button-new-requisition"
            >
              <Plus className="mr-3 h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">New Requisition</div>
                <div className="text-sm text-slate-500">Request materials for the field</div>
              </div>
            </Button>

            <Button
              onClick={() => setLocation("/rfqs")}
              className="w-full justify-start"
              variant="ghost"
              data-testid="button-create-rfq"
            >
              <Calendar className="mr-3 h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Create RFQ</div>
                <div className="text-sm text-slate-500">Send quotes to vendors</div>
              </div>
            </Button>

            <Button
              onClick={() => setLocation("/invoices")}
              className="w-full justify-start"
              variant="ghost"
              data-testid="button-upload-invoice"
            >
              <Upload className="mr-3 h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Upload Invoice</div>
                <div className="text-sm text-slate-500">Process vendor invoices</div>
              </div>
            </Button>

            <Button
              onClick={() => setLocation("/reports")}
              className="w-full justify-start"
              variant="ghost"
              data-testid="button-view-reports"
            >
              <BarChart3 className="mr-3 h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">View Reports</div>
                <div className="text-sm text-slate-500">Budget and cost analysis</div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-3 p-3 rounded-lg">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2 mb-1" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-4">
                {activity.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900" data-testid="activity-title">
                        {item.entityType} {item.action}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.user ? `${item.user.firstName} ${item.user.lastName}` : 'System'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Clock className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Project Budget Overview</CardTitle>
          <Button variant="ghost" size="sm">
            View details
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-900">Zone A-1: Main Lobby</h4>
                <Badge variant="secondary">75% complete</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Budget: $125,000</span>
                  <span>Actual: $92,150</span>
                </div>
                <Progress value={74} className="h-2" />
                <div className="flex justify-between text-xs text-slate-500">
                  <span className="text-green-600">Remaining: $32,850</span>
                  <span className="text-green-600">Under budget</span>
                </div>
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-900">Zone B-3: Restrooms</h4>
                <Badge variant="secondary">45% complete</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Budget: $85,000</span>
                  <span>Actual: $38,750</span>
                </div>
                <Progress value={46} className="h-2" />
                <div className="flex justify-between text-xs text-slate-500">
                  <span className="text-blue-600">Remaining: $46,250</span>
                  <span className="text-green-600">On track</span>
                </div>
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-900">Zone C-2: Office Areas</h4>
                <Badge variant="secondary">20% complete</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Budget: $195,000</span>
                  <span>Actual: $18,900</span>
                </div>
                <Progress value={23} className="h-2" />
                <div className="flex justify-between text-xs text-slate-500">
                  <span className="text-amber-600">Remaining: $176,100</span>
                  <span className="text-green-600">Early stage</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Performance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top Vendor Performance</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/vendors")}>
            View all vendors
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "ABC Supply Co.", category: "General Materials", onTime: 94, response: "2.3h" },
              { name: "FireSafe Systems", category: "Fire Protection", onTime: 88, response: "4.1h" },
              { name: "Bobrick Hardware", category: "Restroom Accessories", onTime: 96, response: "1.8h" },
              { name: "Metro Lockers Inc.", category: "Storage & Lockers", onTime: 78, response: "6.2h" },
            ].map((vendor, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Package className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{vendor.name}</div>
                    <div className="text-sm text-slate-500">{vendor.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-green-600">{vendor.onTime}%</span>
                    <span className="text-xs text-slate-500">on-time</span>
                  </div>
                  <div className="text-xs text-slate-400">{vendor.response} avg response</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
