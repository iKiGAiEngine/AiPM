import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, Check, X, AlertTriangle } from "lucide-react";

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Real invoice data - no mock data available 
  // This would fetch from API: /api/invoices/{id}
  // For now, no real invoices exist, so show empty state

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <Card className="border-muted">
        <CardContent className="p-6">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No invoices available yet</p>
            <p className="text-sm text-muted-foreground mt-2">Invoices will appear here once you start the procurement process</p>
            <Button onClick={() => navigate("/invoices")} className="mt-4">
              Back to Invoices
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}