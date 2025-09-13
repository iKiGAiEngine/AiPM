import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { insertVendorSchema } from "@shared/schema";

// Extend the schema with client-side validation
const vendorFormSchema = insertVendorSchema.extend({
  email: z.string().email("Please enter a valid email address")
});

type VendorFormData = z.infer<typeof vendorFormSchema>;

export default function NewVendor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deliveryRegions, setDeliveryRegions] = useState<string>("");

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      address: "",
      terms: "",
      deliveryRegions: [],
      taxRules: null,
      ediFlags: false,
      isActive: true
    }
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: VendorFormData) => {
      // Convert delivery regions string to array
      const vendorData = {
        ...data,
        deliveryRegions: deliveryRegions.split(',').map(r => r.trim()).filter(r => r.length > 0)
      };
      
      const response = await apiRequest('POST', '/api/vendors', vendorData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vendor created",
        description: "New vendor has been successfully added."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      navigate("/vendors");
    },
    onError: (error: any) => {
      toast({
        title: "Error creating vendor",
        description: error.message || "Failed to create vendor. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: VendorFormData) => {
    createVendorMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/vendors")}
          className="mb-4"
          data-testid="button-back-vendors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Vendors
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Vendor</h1>
          <p className="text-muted-foreground">Create a new vendor profile for procurement management</p>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Vendor Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Smith" 
                          data-testid="input-vendor-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ABC Construction Supply" 
                          data-testid="input-vendor-company"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="vendor@company.com" 
                          data-testid="input-vendor-email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(555) 123-4567" 
                          data-testid="input-vendor-phone"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="123 Main St, City, State, ZIP" 
                        data-testid="input-vendor-address"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Net 30, 2/10 Net 30, etc." 
                        data-testid="input-vendor-terms"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <label className="text-sm font-medium mb-2 block">Delivery Regions</label>
                <Input
                  placeholder="New York, New Jersey, Connecticut (comma separated)"
                  value={deliveryRegions}
                  onChange={(e) => setDeliveryRegions(e.target.value)}
                  data-testid="input-vendor-regions"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter regions separated by commas
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <FormField
                  control={form.control}
                  name="ediFlags"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-vendor-edi"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>EDI Enabled</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Electronic Data Interchange capabilities
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-vendor-active"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active Vendor</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Available for new orders
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/vendors")}
                  data-testid="button-cancel-vendor"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createVendorMutation.isPending}
                  data-testid="button-save-vendor"
                >
                  {createVendorMutation.isPending ? "Creating..." : "Create Vendor"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}