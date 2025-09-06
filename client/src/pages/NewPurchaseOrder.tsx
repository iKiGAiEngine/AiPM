import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PurchaseOrderForm from "@/components/forms/PurchaseOrderForm";
import type { Requisition, RequisitionLine, PurchaseOrder, PurchaseOrderLine } from "@shared/schema";

interface NewPurchaseOrderProps {
  isEdit?: boolean;
}

export default function NewPurchaseOrder({ isEdit = false }: NewPurchaseOrderProps) {
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const requisitionId = searchParams.get('requisitionId');

  // Fetch existing PO data if editing
  const { data: existingPO } = useQuery<PurchaseOrder & { lines: PurchaseOrderLine[] }>({
    queryKey: ['/api/purchase-orders', id],
    queryFn: async () => {
      if (!isEdit || !id) return null;
      
      // Fetch both PO and its lines
      const [poResponse, linesResponse] = await Promise.all([
        fetch(`/api/purchase-orders/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }),
        fetch(`/api/purchase-orders/${id}/lines`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        })
      ]);
      
      if (!poResponse.ok || !linesResponse.ok) {
        throw new Error('Failed to fetch purchase order data');
      }
      
      const poData = await poResponse.json();
      const linesData = await linesResponse.json();
      
      return { ...poData, lines: linesData };
    },
    enabled: isEdit && !!id,
  });

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
            {isEdit ? 'Edit Purchase Order' : (requisition ? `New Purchase Order from ${requisition.title}` : 'New Purchase Order')}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Modify the purchase order details' : (requisition ? 'Purchase order will be pre-filled with requisition items' : 'Create a new purchase order')}
          </p>
        </div>
      </div>

      {/* Form */}
      <PurchaseOrderForm 
        fromRequisition={requisition} 
        isEdit={isEdit} 
        existingPO={existingPO}
      />
    </div>
  );
}