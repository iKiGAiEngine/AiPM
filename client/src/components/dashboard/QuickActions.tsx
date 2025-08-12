import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Calendar, 
  Upload, 
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/lib/auth";

export default function QuickActions() {
  const { user } = useAuth();

  const canAccess = (roles: string[]) => {
    return user && authService.hasRole(roles, user.role);
  };

  const actions = [
    {
      title: "New Requisition",
      description: "Request materials for the field",
      icon: Plus,
      bgColor: "bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:hover:bg-primary-900/30",
      iconBg: "bg-primary-600",
      iconColor: "text-white",
      roles: ["Admin", "PM", "Purchaser", "Field"],
      onClick: () => console.log("Create requisition"),
      testId: "button-new-requisition"
    },
    {
      title: "Create RFQ",
      description: "Send quotes to vendors",
      icon: Calendar,
      bgColor: "bg-muted hover:bg-muted/80",
      iconBg: "bg-muted-foreground",
      iconColor: "text-white",
      roles: ["Admin", "PM", "Purchaser"],
      onClick: () => console.log("Create RFQ"),
      testId: "button-create-rfq"
    },
    {
      title: "Upload Invoice",
      description: "Process vendor invoices",
      icon: Upload,
      bgColor: "bg-muted hover:bg-muted/80",
      iconBg: "bg-muted-foreground",
      iconColor: "text-white",
      roles: ["Admin", "PM", "AP"],
      onClick: () => console.log("Upload invoice"),
      testId: "button-upload-invoice"
    },
    {
      title: "View Reports",
      description: "Budget and cost analysis",
      icon: BarChart3,
      bgColor: "bg-muted hover:bg-muted/80",
      iconBg: "bg-muted-foreground",
      iconColor: "text-white",
      roles: ["Admin", "PM", "Purchaser", "AP"],
      onClick: () => console.log("View reports"),
      testId: "button-view-reports"
    }
  ];

  const accessibleActions = actions.filter(action => canAccess(action.roles));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {accessibleActions.map((action) => (
            <Button
              key={action.testId}
              variant="ghost"
              className={`w-full justify-start p-3 h-auto transition-colors ${action.bgColor}`}
              onClick={action.onClick}
              data-testid={action.testId}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${action.iconBg}`}>
                <action.icon className={`w-4 h-4 ${action.iconColor}`} />
              </div>
              <div className="ml-3 text-left">
                <div className="font-medium text-foreground">{action.title}</div>
                <div className="text-sm text-muted-foreground">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
