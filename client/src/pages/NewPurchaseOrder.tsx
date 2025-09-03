import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PurchaseOrderForm from "@/components/forms/PurchaseOrderForm";
import type { Requisition, RequisitionLine } from "@shared/schema";

export default function NewPurchaseOrder() {
  const [searchParams] = useSearchParams();
  const requisitionId = searchParams.get('requisitionId');

  // Fetch requisition data if creating PO from requisition
  const { data: requisition } = useQuery<Requisition & { lines: RequisitionLine[] }>({
    queryKey: ['/api/requisitions', requisitionId],
    queryFn: async () => {
      if (!requisitionId) return null;
      
      // Fetch both requisition and its lines
      const [reqResponse, linesResponse] = await Promise.all([
        fetch(`/api/requisitions/${requisitionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }),
        fetch(`/api/requisitions/${requisitionId}/lines`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        })
      ]);
      
      if (!reqResponse.ok || !linesResponse.ok) {
        throw new Error('Failed to fetch requisition data');
      }
      
      const requisitionData = await reqResponse.json();
      const linesData = await linesResponse.json();
      
      return { ...requisitionData, lines: linesData };
    },
    enabled: !!requisitionId,
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/purchase-orders">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Purchase Orders
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {requisition ? `New Purchase Order from ${requisition.title}` : 'New Purchase Order'}
          </h1>
          <p className="text-muted-foreground">
            {requisition ? 'Purchase order will be pre-filled with requisition items' : 'Create a new purchase order'}
          </p>
        </div>
      </div>

      {/* Form */}
      <PurchaseOrderForm fromRequisition={requisition} />
    </div>
  );
}