import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Package, ExternalLink } from "lucide-react";

const trackingSchema = z.object({
  trackingNumber: z.string().min(1, "Tracking number is required"),
  carrierName: z.string().min(1, "Carrier is required"),
});

type TrackingFormData = z.infer<typeof trackingSchema>;

interface TrackingInfoFormProps {
  poId: string;
  poNumber: string;
  onSubmit: (data: TrackingFormData) => Promise<void>;
  onCancel: () => void;
}

const CARRIERS = [
  "FedEx",
  "UPS", 
  "USPS",
  "DHL",
  "TNT",
  "FedEx Freight",
  "UPS Freight",
  "Old Dominion",
  "YRC Freight",
  "R+L Carriers",
  "ABF Freight",
  "Saia",
  "Estes Express Lines",
  "XPO Logistics",
  "Other"
];

export function TrackingInfoForm({ 
  poId, 
  poNumber, 
  onSubmit, 
  onCancel 
}: TrackingInfoFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TrackingFormData>({
    resolver: zodResolver(trackingSchema),
    defaultValues: {
      trackingNumber: "",
      carrierName: "",
    },
  });

  const handleSubmit = async (data: TrackingFormData) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setIsLoading(false);
    }
  };

  const trackingNumber = form.watch("trackingNumber");
  const carrierName = form.watch("carrierName");

  const getTrackingUrl = (carrier: string, trackingNum: string) => {
    if (!trackingNum || !carrier) return null;
    
    const cleanTrackingNum = trackingNum.replace(/\s+/g, '');
    
    switch (carrier.toLowerCase()) {
      case 'fedex':
        return `https://www.fedex.com/fedextrack/?trknbr=${cleanTrackingNum}`;
      case 'ups':
        return `https://www.ups.com/track?tracknum=${cleanTrackingNum}`;
      case 'usps':
        return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleanTrackingNum}`;
      case 'dhl':
        return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${cleanTrackingNum}`;
      default:
        return null;
    }
  };

  const trackingUrl = getTrackingUrl(carrierName, trackingNumber);

  return (
    <Card data-testid={`tracking-info-form-${poId}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-orange-100">
            <Truck className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <CardTitle>Add Tracking Information</CardTitle>
            <CardDescription>
              Enter shipping details for PO {poNumber}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Carrier Selection */}
            <FormField
              control={form.control}
              name="carrierName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Shipping Carrier
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="carrier-select">
                        <SelectValue placeholder="Select shipping carrier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CARRIERS.map((carrier) => (
                        <SelectItem key={carrier} value={carrier}>
                          {carrier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tracking Number */}
            <FormField
              control={form.control}
              name="trackingNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Tracking Number
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter tracking number"
                      {...field}
                      data-testid="tracking-number-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tracking Link Preview */}
            {trackingUrl && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-900">
                  <ExternalLink className="h-4 w-4" />
                  <span>Tracking Link:</span>
                </div>
                <a 
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                  data-testid="tracking-link-preview"
                >
                  {trackingUrl}
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                data-testid="button-cancel-tracking"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="button-submit-tracking"
              >
                {isLoading ? "Adding..." : "Add Tracking Info"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}