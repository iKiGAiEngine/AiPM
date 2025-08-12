import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export default function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  variant = 'default' 
}: StatsCardProps) {
  const getIconColor = () => {
    switch (variant) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-amber-600 bg-amber-100';
      case 'danger':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const getSubtitleColor = () => {
    switch (variant) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-amber-600';
      case 'danger':
        return 'text-red-600';
      default:
        return 'text-green-600';
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-2xl font-bold text-slate-900" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            <p className={`text-xs font-medium ${getSubtitleColor()}`}>
              {subtitle}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getIconColor()}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
