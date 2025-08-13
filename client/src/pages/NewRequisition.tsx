import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
// import RequisitionForm from "@/components/forms/RequisitionForm";

export default function NewRequisition() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/requisitions">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requisitions
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Requisition</h1>
          <p className="text-muted-foreground">Create a new material request</p>
        </div>
      </div>

      {/* Form - Temporarily disabled for navigation debugging */}
      <div className="p-6 bg-muted/50 rounded-lg text-center">
        <p>Requisition form temporarily disabled for navigation debugging</p>
      </div>
    </div>
  );
}