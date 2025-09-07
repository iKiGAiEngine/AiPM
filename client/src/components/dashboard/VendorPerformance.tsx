import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Vendor {
  id: string;
  name: string;
  company: string;
  category: string;
  onTimePercentage: number;
  avgResponseTime: string;
  initials: string;
}

// Real vendor performance data - no mock data shown until real data exists
const vendors: Vendor[] = [];

const getPerformanceBadgeColor = (percentage: number) => {
  if (percentage >= 95) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
  if (percentage >= 85) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
  if (percentage >= 75) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
};

export default function VendorPerformance() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Vendor Performance</CardTitle>
        <Button variant="ghost" size="sm" data-testid="button-view-vendor-details">
          View all vendors
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {vendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No vendor data available</p>
              <p className="text-xs mt-1">Add vendors and start procurement to see performance metrics</p>
            </div>
          ) : (
            vendors.map((vendor) => (
              <div 
                key={vendor.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                data-testid={`vendor-performance-${vendor.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-sm font-medium text-foreground" data-testid={`vendor-initials-${vendor.id}`}>
                      {vendor.initials}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-foreground" data-testid={`vendor-name-${vendor.id}`}>
                      {vendor.name}
                    </div>
                    <div className="text-sm text-muted-foreground" data-testid={`vendor-category-${vendor.id}`}>
                      {vendor.category}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-1">
                    <span 
                      className={`text-sm font-medium px-2 py-1 rounded-full ${getPerformanceBadgeColor(vendor.onTimePercentage)}`}
                      data-testid={`vendor-on-time-${vendor.id}`}
                    >
                      {vendor.onTimePercentage}%
                    </span>
                    <span className="text-xs text-muted-foreground">on-time</span>
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid={`vendor-response-time-${vendor.id}`}>
                    {vendor.avgResponseTime} avg response
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
