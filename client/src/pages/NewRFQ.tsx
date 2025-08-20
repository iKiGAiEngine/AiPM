import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
// import { RFQForm } from "@/components/forms/rfq-form";

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
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">RFQ Title *</label>
                <input 
                  type="text"
                  placeholder="Enter RFQ title"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Project *</label>
                <select className="w-full px-3 py-2 border border-input bg-background rounded-md">
                  <option value="">Select a project</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea 
                placeholder="Enter RFQ description"
                rows={4}
                className="w-full px-3 py-2 border border-input bg-background rounded-md resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bid Due Date</label>
                <input 
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ship To Address</label>
                <input 
                  type="text"
                  placeholder="Enter delivery address"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => navigate("/rfqs")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button data-testid="button-create-rfq">
                Create RFQ
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}