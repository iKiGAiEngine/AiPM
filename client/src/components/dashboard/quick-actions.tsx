import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Upload, BarChart3 } from 'lucide-react';

export default function QuickActions() {
  const actions = [
    {
      id: 'new-requisition',
      title: 'New Requisition',
      description: 'Request materials for the field',
      icon: Plus,
      variant: 'primary' as const,
      href: '/requisitions/new'
    },
    {
      id: 'create-rfq',
      title: 'Create RFQ',
      description: 'Send quotes to vendors',
      icon: Calendar,
      variant: 'secondary' as const,
      href: '/quotes/new'
    },
    {
      id: 'upload-invoice',
      title: 'Upload Invoice',
      description: 'Process vendor invoices',
      icon: Upload,
      variant: 'secondary' as const,
      href: '/invoices/upload'
    },
    {
      id: 'view-reports',
      title: 'View Reports',
      description: 'Budget and cost analysis',
      icon: BarChart3,
      variant: 'secondary' as const,
      href: '/reports'
    }
  ];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const isPrimary = action.variant === 'primary';
          
          return (
            <Button
              key={action.id}
              variant={isPrimary ? "default" : "outline"}
              className={`w-full justify-start p-4 h-auto text-left ${
                isPrimary 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                  : 'hover:bg-slate-50'
              }`}
              onClick={() => {
                // Navigate to action.href
                console.log(`Navigate to ${action.href}`);
              }}
              data-testid={`action-${action.id}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                isPrimary 
                  ? 'bg-primary-foreground/20 text-primary-foreground' 
                  : 'bg-slate-100 text-slate-600'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-medium">{action.title}</div>
                <div className={`text-sm ${isPrimary ? 'text-primary-foreground/80' : 'text-slate-500'}`}>
                  {action.description}
                </div>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
