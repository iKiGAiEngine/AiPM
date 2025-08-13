import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const poLineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  unit: z.string().min(1, "Unit is required"),
});

const purchaseOrderSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  projectId: z.string().min(1, "Project is required"),
  shipToAddress: z.string().min(1, "Ship to address is required"),
  notes: z.string().optional(),
  lines: z.array(poLineSchema).min(1, "At least one line item is required"),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;
type POLine = z.infer<typeof poLineSchema>;

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<POLine[]>([
    { description: "", quantity: 1, unitPrice: 0, unit: "EA" }
  ]);

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      vendorId: "",
      projectId: "",
      shipToAddress: "",
      notes: "",
      lines: [],
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await fetch("/api/vendors", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch vendors");
      return response.json();
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PurchaseOrderFormData) => {
      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create purchase order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      navigate("/purchase-orders");
    },
  });

  const addLine = () => {
    setLines([...lines, { description: "", quantity: 1, unitPrice: 0, unit: "EA" }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof POLine, value: any) => {
    const updatedLines = [...lines];
    updatedLines[index] = { ...updatedLines[index], [field]: value };
    setLines(updatedLines);
  };

  const onSubmit = (data: Omit<PurchaseOrderFormData, 'lines'>) => {
    const formData = { ...data, lines };
    createMutation.mutate(formData);
  };

  const calculateTotal = () => {
    return lines.reduce((total, line) => total + (line.quantity * line.unitPrice), 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Order Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="vendorId">Vendor *</Label>
              <Select
                value={form.watch("vendorId")}
                onValueChange={(value) => form.setValue("vendorId", value)}
              >
                <SelectTrigger data-testid="select-vendor">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.vendorId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.vendorId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectId">Project *</Label>
              <Select
                value={form.watch("projectId")}
                onValueChange={(value) => form.setValue("projectId", value)}
              >
                <SelectTrigger data-testid="select-project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.projectId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.projectId.message}
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="shipToAddress">Ship To Address *</Label>
              <Textarea
                {...form.register("shipToAddress")}
                id="shipToAddress"
                placeholder="Enter shipping address"
                data-testid="textarea-ship-to"
              />
              {form.formState.errors.shipToAddress && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.shipToAddress.message}
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                {...form.register("notes")}
                id="notes"
                placeholder="Additional notes or instructions"
                data-testid="textarea-notes"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Line Items</h3>
              <Button type="button" onClick={addLine} size="sm" data-testid="button-add-line">
                <Plus className="w-4 h-4 mr-2" />
                Add Line
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(index, "description", e.target.value)}
                        placeholder="Item description"
                        data-testid={`input-description-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, "quantity", parseFloat(e.target.value) || 0)}
                        min="0.01"
                        step="0.01"
                        data-testid={`input-quantity-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.unit}
                        onChange={(e) => updateLine(index, "unit", e.target.value)}
                        placeholder="EA"
                        data-testid={`input-unit-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        data-testid={`input-unit-price-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      ${(line.quantity * line.unitPrice).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        disabled={lines.length === 1}
                        data-testid={`button-remove-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end">
              <div className="text-lg font-medium">
                Total: ${calculateTotal().toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/purchase-orders")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              data-testid="button-create-po"
            >
              {createMutation.isPending ? (
                "Creating..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Purchase Order
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}