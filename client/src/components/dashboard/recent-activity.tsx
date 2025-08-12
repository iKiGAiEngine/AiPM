import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Truck, FileText } from 'lucide-react';
import type { ActivityItem } from '@/types';

const mockActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'approval',
    title: 'PO #2024-001 approved for $12,450',
    description: 'ABC Supply - Restroom accessories for Zone B-3',
    timestamp: '2 hours ago',
    icon: 'check'
  },
  {
    id: '2',
    type: 'exception',
    title: 'Invoice exception: Price variance on INV-4521',
    description: '$150 difference from PO #2024-003 - requires review',
    timestamp: '4 hours ago',
    icon: 'warning'
  },
  {
    id: '3',
    type: 'delivery',
    title: 'Delivery received: Fire protection equipment',
    description: 'FireSafe Systems - Zone A-1, 15 items received',
    timestamp: '6 hours ago',
    icon: 'truck'
  },
  {
    id: '4',
    type: 'requisition',
    title: 'New requisition submitted by Mike Johnson',
    description: 'REQ-2024-045 - Grab bars and accessories for Zone C-2',
    timestamp: '1 day ago',
    icon: 'file'
  }
];

export default function RecentActivity() {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'approval':
        return CheckCircle;
      case 'exception':
        return AlertTriangle;
      case 'delivery':
        return Truck;
      case 'requisition':
        return FileText;
      default:
        return FileText;
    }
  };

  const getIconColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'approval':
        return 'text-green-600 bg-green-100';
      case 'exception':
        return 'text-amber-600 bg-amber-100';
      case 'delivery':
        return 'text-blue-600 bg-blue-100';
      case 'requisition':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" data-testid="view-all-activity">
          View all
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockActivity.map((item) => {
          const Icon = getIcon(item.type);
          const iconColor = getIconColor(item.type);
          
          return (
            <div
              key={item.id}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              data-testid={`activity-${item.id}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {item.title}
                </p>
                <p className="text-sm text-slate-500">
                  {item.description}
                </p>
                <p className="text-xs text-slate-400 mt-1">{item.timestamp}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
