import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, CheckCircle, Package, MessageSquare } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const acknowledgmentSchema = z.object({
  estimatedShipmentDate: z.date().optional(),
  notes: z.string().optional(),
});

type AcknowledgmentFormData = z.infer<typeof acknowledgmentSchema>;

interface VendorAcknowledgmentFormProps {
  poId: string;
  poNumber: string;
  vendorName: string;
  onSubmit: (data: AcknowledgmentFormData) => Promise<void>;
  onCancel: () => void;
}

export function VendorAcknowledgmentForm({ 
  poId, 
  poNumber, 
  vendorName, 
  onSubmit, 
  onCancel 
}: VendorAcknowledgmentFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AcknowledgmentFormData>({
    resolver: zodResolver(acknowledgmentSchema),
    defaultValues: {
      notes: "",
    },
  });

  const handleSubmit = async (data: AcknowledgmentFormData) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card data-testid={`vendor-acknowledgment-form-${poId}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-blue-100">
            <CheckCircle className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Vendor Acknowledgment</CardTitle>
            <CardDescription>
              Acknowledge receipt of PO {poNumber} from {vendorName}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Estimated Shipment Date */}
            <FormField
              control={form.control}
              name="estimatedShipmentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Estimated Shipment Date
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="estimated-shipment-date-picker"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Select estimated shipment date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notes (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about the shipment, special requirements, or delivery instructions..."
                      className="min-h-[100px]"
                      {...field}
                      data-testid="acknowledgment-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                data-testid="button-cancel-acknowledgment"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="button-submit-acknowledgment"
              >
                {isLoading ? "Acknowledging..." : "Acknowledge PO"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}