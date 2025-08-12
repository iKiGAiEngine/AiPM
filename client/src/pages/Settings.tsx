import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Building, 
  Users, 
  Settings as SettingsIcon, 
  Mail, 
  Shield, 
  CreditCard,
  Bell,
  Globe,
  Save
} from "lucide-react";

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  domain: z.string().optional(),
  settings: z.object({
    tolerances: z.object({
      pricePercentage: z.number().min(0).max(100),
      quantityPercentage: z.number().min(0).max(100),
      taxFreightCap: z.number().min(0),
    }),
    defaultSettings: z.object({
      usepeenedGrabBars: z.boolean(),
      currency: z.string(),
      timezone: z.string(),
    }),
  }),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("organization");

  const { data: organization, isLoading } = useQuery({
    queryKey: ['/api/organization'],
    queryFn: async () => {
      const response = await fetch('/api/organization', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch organization');
      return response.json();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: user?.role === 'Admin',
  });

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || '',
      domain: organization?.domain || '',
      settings: {
        tolerances: {
          pricePercentage: organization?.settings?.tolerances?.pricePercentage || 2.0,
          quantityPercentage: organization?.settings?.tolerances?.quantityPercentage || 1.0,
          taxFreightCap: organization?.settings?.tolerances?.taxFreightCap || 50.0,
        },
        defaultSettings: {
          usepeenedGrabBars: organization?.settings?.defaultSettings?.usepeenedGrabBars || false,
          currency: organization?.settings?.defaultSettings?.currency || 'USD',
          timezone: organization?.settings?.defaultSettings?.timezone || 'America/New_York',
        },
      },
    },
  });

  const updateOrganization = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      const response = await fetch('/api/organization', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update organization');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organization'] });
      toast({
        title: "Success",
        description: "Organization settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update organization settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OrganizationFormData) => {
    updateOrganization.mutate(data);
  };

  // Check if user has admin access
  if (!user || (user.role !== 'Admin' && user.role !== 'PM')) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive">Access denied. Admin or PM role required.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage organization settings and user permissions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="organization" className="flex items-center space-x-2" data-testid="tab-organization">
            <Building className="w-4 h-4" />
            <span>Organization</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2" data-testid="tab-users">
            <Users className="w-4 h-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="procurement" className="flex items-center space-x-2" data-testid="tab-procurement">
            <SettingsIcon className="w-4 h-4" />
            <span>Procurement</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2" data-testid="tab-notifications">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </TabsTrigger>
        </TabsList>

        {/* Organization Settings */}
        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Organization Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Organization Name *</Label>
                    <Input
                      {...form.register('name')}
                      id="name"
                      placeholder="Enter organization name"
                      data-testid="input-org-name"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain</Label>
                    <Input
                      {...form.register('domain')}
                      id="domain"
                      placeholder="company.com"
                      data-testid="input-org-domain"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Default Currency</Label>
                    <Select onValueChange={(value) => form.setValue('settings.defaultSettings.currency', value)}>
                      <SelectTrigger data-testid="select-currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Default Timezone</Label>
                    <Select onValueChange={(value) => form.setValue('settings.defaultSettings.timezone', value)}>
                      <SelectTrigger data-testid="select-timezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time (US & Canada)</SelectItem>
                        <SelectItem value="America/Chicago">Central Time (US & Canada)</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time (US & Canada)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time (US & Canada)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={updateOrganization.isPending} data-testid="button-save-organization">
                  <Save className="w-4 h-4 mr-2" />
                  {updateOrganization.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Management */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                User Management
              </CardTitle>
              <Button data-testid="button-invite-user">
                <Mail className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No users found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user: any, index: number) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border border-border rounded-lg" data-testid={`user-item-${index}`}>
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="secondary">{user.role}</Badge>
                        <Badge variant={user.isActive ? "default" : "destructive"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Procurement Settings */}
        <TabsContent value="procurement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="w-5 h-5 mr-2" />
                3-Way Match Tolerances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pricePercentage">Price Variance Tolerance (%)</Label>
                    <Input
                      {...form.register('settings.tolerances.pricePercentage', { valueAsNumber: true })}
                      id="pricePercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      data-testid="input-price-tolerance"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum price variance before flagging as exception
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quantityPercentage">Quantity Variance Tolerance (%)</Label>
                    <Input
                      {...form.register('settings.tolerances.quantityPercentage', { valueAsNumber: true })}
                      id="quantityPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      data-testid="input-quantity-tolerance"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum quantity variance before flagging as exception
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="taxFreightCap">Tax/Freight Cap ($)</Label>
                    <Input
                      {...form.register('settings.tolerances.taxFreightCap', { valueAsNumber: true })}
                      id="taxFreightCap"
                      type="number"
                      min="0"
                      step="0.01"
                      data-testid="input-tax-freight-cap"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum absolute variance for tax and freight charges
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Default Settings</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="usepeenedGrabBars">Use Peened Grab Bars by Default</Label>
                      <p className="text-xs text-muted-foreground">
                        Default to peened surface grab bars for ADA compliance
                      </p>
                    </div>
                    <Switch
                      {...form.register('settings.defaultSettings.usepeenedGrabBars')}
                      id="usepeenedGrabBars"
                      data-testid="switch-peened-grab-bars"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={updateOrganization.isPending} data-testid="button-save-procurement">
                  <Save className="w-4 h-4 mr-2" />
                  {updateOrganization.isPending ? 'Saving...' : 'Save Procurement Settings'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Email Notifications</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Requisition Approvals</Label>
                      <p className="text-xs text-muted-foreground">
                        Notify when requisitions need approval
                      </p>
                    </div>
                    <Switch defaultChecked data-testid="switch-req-notifications" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Invoice Exceptions</Label>
                      <p className="text-xs text-muted-foreground">
                        Notify when invoices have matching exceptions
                      </p>
                    </div>
                    <Switch defaultChecked data-testid="switch-invoice-notifications" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>PO Acknowledgments</Label>
                      <p className="text-xs text-muted-foreground">
                        Notify when vendors acknowledge purchase orders
                      </p>
                    </div>
                    <Switch defaultChecked data-testid="switch-po-notifications" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Delivery Updates</Label>
                      <p className="text-xs text-muted-foreground">
                        Notify when deliveries are received
                      </p>
                    </div>
                    <Switch defaultChecked data-testid="switch-delivery-notifications" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Digest Settings</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Daily Digest</Label>
                      <p className="text-xs text-muted-foreground">
                        Daily summary of procurement activities
                      </p>
                    </div>
                    <Switch defaultChecked data-testid="switch-daily-digest" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Weekly Report</Label>
                      <p className="text-xs text-muted-foreground">
                        Weekly procurement performance report
                      </p>
                    </div>
                    <Switch defaultChecked data-testid="switch-weekly-report" />
                  </div>
                </div>
              </div>

              <Button data-testid="button-save-notifications">
                <Save className="w-4 h-4 mr-2" />
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
