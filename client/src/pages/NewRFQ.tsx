import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { RFQForm } from "@/components/forms/rfq-form";

export default function NewRFQ() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/rfqs");
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/rfqs")}
          data-testid="button-back-to-rfqs"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to RFQs
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create New RFQ</h1>
          <p className="text-muted-foreground">Request quotes from vendors for materials and services</p>
        </div>
      </div>

      {/* RFQ Form */}
      <Card>
        <CardHeader>
          <CardTitle>RFQ Details</CardTitle>
        </CardHeader>
        <CardContent>
          <RFQForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}