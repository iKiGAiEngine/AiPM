import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import RequisitionForm from "@/components/forms/RequisitionForm";

export default function NewRequisition() {
  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link to="/requisitions">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Back to Requisitions</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">New Requisition</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Create a new material request</p>
        </div>
      </div>

      {/* Form */}
      <RequisitionForm />
    </div>
  );
}