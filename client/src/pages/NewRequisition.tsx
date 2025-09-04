import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router-dom";
import RequisitionForm from "@/components/forms/RequisitionForm";

interface NewRequisitionProps {
  isEdit?: boolean;
}

export default function NewRequisition({ isEdit = false }: NewRequisitionProps) {
  const { id } = useParams<{ id: string }>();
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {isEdit ? 'Edit Requisition' : 'New Requisition'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isEdit ? 'Modify your material request' : 'Create a new material request'}
          </p>
        </div>
      </div>

      {/* Form */}
      <RequisitionForm isEdit={isEdit} requisitionId={id} />
    </div>
  );
}