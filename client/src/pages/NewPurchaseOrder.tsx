import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import PurchaseOrderForm from "@/components/forms/PurchaseOrderForm";

export default function NewPurchaseOrder() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/purchase-orders">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Purchase Orders
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Purchase Order</h1>
          <p className="text-muted-foreground">Create a new purchase order</p>
        </div>
      </div>

      {/* Form */}
      <PurchaseOrderForm />
    </div>
  );
}