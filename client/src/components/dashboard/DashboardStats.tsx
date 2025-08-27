import { useQuery } from "@tanstack/react-query";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ClipboardList, 
  FileText, 
  AlertTriangle, 
  DollarSign,
  TrendingUp,
  TrendingDown 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  openRequisitions: number;
  pendingPOs: number;
  invoiceExceptions: number;
  costSavings: string;
  totalProjects: number;
  activeProjects: number;
}

export default function DashboardStats() {
  const { selectedProject } = useProject();
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats', selectedProject?.id],
    queryFn: async () => {
      const url = selectedProject ? `/api/dashboard/stats?projectId=${selectedProject.id}` : '/api/dashboard/stats';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-24">
              <p className="text-destructive text-sm">Failed to load stats</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: "Open Requisitions",
      value: stats.openRequisitions,
      change: "+3 this week",
      changeType: "positive" as const,
      icon: ClipboardList,
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      testId: "stat-open-requisitions"
    },
    {
      title: "Pending POs",
      value: stats.pendingPOs,
      change: "$145K total",
      changeType: "neutral" as const,
      icon: FileText,
      bgColor: "bg-amber-100 dark:bg-amber-900/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      testId: "stat-pending-pos"
    },
    {
      title: "Invoice Exceptions",
      value: stats.invoiceExceptions,
      change: "Needs attention",
      changeType: "negative" as const,
      icon: AlertTriangle,
      bgColor: "bg-red-100 dark:bg-red-900/20",
      iconColor: "text-red-600 dark:text-red-400",
      testId: "stat-invoice-exceptions"
    },
    {
      title: "Cost Savings",
      value: `$${parseFloat(stats.costSavings || '0').toLocaleString()}`,
      change: "This month",
      changeType: "positive" as const,
      icon: DollarSign,
      bgColor: "bg-green-100 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
      testId: "stat-cost-savings"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat) => (
        <Card key={stat.testId} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground" data-testid={`${stat.testId}-title`}>
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground" data-testid={`${stat.testId}-value`}>
                  {stat.value}
                </p>
                <p className={`text-xs font-medium flex items-center mt-1 ${
                  stat.changeType === 'positive' ? 'text-green-600 dark:text-green-400' :
                  stat.changeType === 'negative' ? 'text-red-600 dark:text-red-400' :
                  'text-muted-foreground'
                }`} data-testid={`${stat.testId}-change`}>
                  {stat.changeType === 'positive' && <TrendingUp className="w-3 h-3 mr-1" />}
                  {stat.changeType === 'negative' && <TrendingDown className="w-3 h-3 mr-1" />}
                  {stat.change}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
