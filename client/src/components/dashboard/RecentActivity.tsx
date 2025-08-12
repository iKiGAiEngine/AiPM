import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  AlertTriangle, 
  Truck, 
  ClipboardList,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: 'po_approved' | 'invoice_exception' | 'delivery_received' | 'requisition_submitted' | 'rfq_sent';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'info' | 'error';
}

// Mock data - in a real app this would come from an API
const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'po_approved',
    title: 'PO #2024-001 approved for $12,450',
    description: 'ABC Supply - Restroom accessories for Zone B-3',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'success'
  },
  {
    id: '2',
    type: 'invoice_exception',
    title: 'Invoice exception: Price variance on INV-4521',
    description: '$150 difference from PO #2024-003 - requires review',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: 'warning'
  },
  {
    id: '3',
    type: 'delivery_received',
    title: 'Delivery received: Fire protection equipment',
    description: 'FireSafe Systems - Zone A-1, 15 items received',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    status: 'info'
  },
  {
    id: '4',
    type: 'requisition_submitted',
    title: 'New requisition submitted by Mike Johnson',
    description: 'REQ-2024-045 - Grab bars and accessories for Zone C-2',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: 'info'
  }
];

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'po_approved':
      return CheckCircle;
    case 'invoice_exception':
      return AlertTriangle;
    case 'delivery_received':
      return Truck;
    case 'requisition_submitted':
      return ClipboardList;
    case 'rfq_sent':
      return Clock;
    default:
      return Clock;
  }
};

const getActivityIconColor = (status: ActivityItem['status']) => {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400';
    case 'warning':
      return 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400';
    case 'error':
      return 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400';
    case 'info':
    default:
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
  }
};

export default function RecentActivity() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" data-testid="button-view-all-activity">
          View all
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            mockActivities.map((activity) => {
              const IconComponent = getActivityIcon(activity.type);
              const iconColorClass = getActivityIconColor(activity.status);
              
              return (
                <div 
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  data-testid={`activity-item-${activity.id}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconColorClass}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground" data-testid={`activity-title-${activity.id}`}>
                      {activity.title}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`activity-description-${activity.id}`}>
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`activity-timestamp-${activity.id}`}>
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
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
