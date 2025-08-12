import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Camera, Plus, X } from 'lucide-react';

const requisitionSchema = z.object({
  zoneId: z.string().min(1, 'Zone is required'),
  targetDeliveryDate: z.string().min(1, 'Delivery date is required'),
  deliveryLocation: z.string().optional(),
  specialInstructions: z.string().optional(),
  lines: z.array(z.object({
    materialId: z.string().optional(),
    description: z.string().min(1, 'Description is required'),
    sku: z.string().optional(),
    manufacturer: z.string().optional(),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unit: z.string().min(1, 'Unit is required'),
    estimatedCost: z.number().optional(),
  })).min(1, 'At least one line item is required'),
});

type RequisitionFormData = z.infer<typeof requisitionSchema>;

const mockMaterials = [
  {
    id: '1',
    sku: 'BOB-2888-SS',
    description: 'Paper Towel Dispenser, Surface Mount, Stainless Steel',
    manufacturer: 'Bobrick',
    lastCost: 142.50,
    unit: 'Each'
  },
  {
    id: '2', 
    sku: 'BOB-4386-SS',
    description: 'Grab Bar 36", 1.5" Diameter, Stainless Steel',
    manufacturer: 'Bobrick',
    lastCost: 89.25,
    unit: 'Each'
  }
];

export default function RequisitionForm() {
  const [searchQuery, setSearchQuery] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  const form = useForm<RequisitionFormData>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      lines: [
        {
          description: '',
          quantity: 1,
          unit: 'Each'
        }
      ]
    }
  });

  const { fields, append, remove } = form.control._defaultValues.lines || [];

  const onSubmit = (data: RequisitionFormData) => {
    console.log('Submitting requisition:', data);
    // Handle form submission
  };

  const addLineItem = () => {
    const currentLines = form.getValues('lines') || [];
    form.setValue('lines', [
      ...currentLines,
      {
        description: '',
        quantity: 1,
        unit: 'Each'
      }
    ]);
  };

  const removeLineItem = (index: number) => {
    const currentLines = form.getValues('lines') || [];
    form.setValue('lines', currentLines.filter((_, i) => i !== index));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          form.setValue('deliveryLocation', `${latitude}, ${longitude}`);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Create New Requisition</CardTitle>
          <Badge variant="outline" className="mt-2">Mobile Optimized</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="zone">Project Zone</Label>
              <Select>
                <SelectTrigger data-testid="zone-select">
                  <SelectValue placeholder="Select zone..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zone-a1">Zone A-1: Main Lobby</SelectItem>
                  <SelectItem value="zone-b3">Zone B-3: Restrooms</SelectItem>
                  <SelectItem value="zone-c2">Zone C-2: Office Areas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="deliveryDate">Target Delivery Date</Label>
              <Input 
                type="date"
                {...form.register('targetDeliveryDate')}
                data-testid="delivery-date-input"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="materialSearch">Search Materials</Label>
            <div className="relative">
              <Input
                placeholder="Search catalog by SKU, description, or manufacturer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="material-search-input"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-900">Selected Materials</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                data-testid="add-line-item"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add line item
              </Button>
            </div>
            
            {mockMaterials.map((material, index) => (
              <div key={index} className="p-4 border border-slate-200 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <div className="font-medium text-slate-900">{material.description}</div>
                    <div className="text-sm text-slate-500">SKU: {material.sku}</div>
                    <div className="text-sm text-slate-500">{material.manufacturer}</div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-600">Quantity</Label>
                    <Input
                      type="number"
                      defaultValue="6"
                      className="mt-1"
                      data-testid={`quantity-${index}`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-600">Unit</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="each">Each</SelectItem>
                        <SelectItem value="box">Box</SelectItem>
                        <SelectItem value="case">Case</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Last cost: <span className="font-medium">${material.lastCost}/each</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => removeLineItem(index)}
                      data-testid={`remove-line-${index}`}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <Label>Photo Attachments</Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
              <Camera className="mx-auto h-12 w-12 text-slate-400" />
              <div className="mt-2">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <Label
                  htmlFor="photo-upload"
                  className="cursor-pointer text-sm font-medium text-primary hover:text-primary/80"
                  data-testid="photo-upload-button"
                >
                  Take Photo or Upload Files
                </Label>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 10MB each</p>
              </div>
            </div>
            {attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {file.name}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => {
                      setAttachments(prev => prev.filter((_, i) => i !== index));
                    }} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="deliveryLocation">Delivery Location</Label>
              <div className="relative">
                <Input
                  placeholder="Drop pin or enter address..."
                  {...form.register('deliveryLocation')}
                  data-testid="delivery-location-input"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={getCurrentLocation}
                  data-testid="get-location-button"
                >
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                placeholder="Installation notes, special requirements..."
                {...form.register('specialInstructions')}
                rows={3}
                data-testid="special-instructions-input"
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between pt-6">
            <div className="text-sm text-slate-600">
              Will be routed to <span className="font-medium">Project Manager</span> for approval
            </div>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                data-testid="save-draft-button"
              >
                Save Draft
              </Button>
              <Button
                type="submit"
                data-testid="submit-requisition-button"
              >
                Submit Requisition
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
