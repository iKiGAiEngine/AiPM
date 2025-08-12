import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { VendorPerformance } from '@/types';

const mockVendors: VendorPerformance[] = [
  {
    id: '1',
    name: 'ABC Supply Co.',
    category: 'General Materials',
    initials: 'ABC',
    onTimePercent: 94,
    avgResponseTime: '2.3h avg response'
  },
  {
    id: '2',
    name: 'FireSafe Systems',
    category: 'Fire Protection',
    initials: 'FS',
    onTimePercent: 88,
    avgResponseTime: '4.1h avg response'
  },
  {
    id: '3',
    name: 'Bobrick Hardware',
    category: 'Restroom Accessories',
    initials: 'BH',
    onTimePercent: 96,
    avgResponseTime: '1.8h avg response'
  },
  {
    id: '4',
    name: 'Metro Lockers Inc.',
    category: 'Storage & Lockers',
    initials: 'ML',
    onTimePercent: 78,
    avgResponseTime: '6.2h avg response'
  }
];

export default function VendorPerformance() {
  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Vendor Performance</CardTitle>
        <Button variant="ghost" size="sm" data-testid="view-vendor-details">
          View all vendors
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockVendors.map((vendor) => (
          <div
            key={vendor.id}
            className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            data-testid={`vendor-${vendor.id}`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <span className="text-sm font-medium text-slate-700">{vendor.initials}</span>
              </div>
              <div>
                <div className="font-medium text-slate-900">{vendor.name}</div>
                <div className="text-sm text-slate-500">{vendor.category}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-1">
                <span className={`text-sm font-medium ${getPerformanceColor(vendor.onTimePercent)}`}>
                  {vendor.onTimePercent}%
                </span>
                <span className="text-xs text-slate-500">on-time</span>
              </div>
              <div className="text-xs text-slate-400">{vendor.avgResponseTime}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
