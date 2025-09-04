import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { 
  Clock, 
  CheckCircle, 
  Truck, 
  Package, 
  DollarSign, 
  Warehouse,
  AlertTriangle,
  Info,
  ExternalLink,
  Calendar
} from "lucide-react";

// Enhanced PO Status Constants
export const PO_STATUSES = {
  DRAFT: 'draft',
  SENT: 'sent',
  PENDING_SHIPMENT: 'pending_shipment',
  PENDING_DELIVERY: 'pending_delivery', 
  DELIVERED: 'delivered',
  MATCHED_PENDING_PAYMENT: 'matched_pending_payment',
  RECEIVED_NBS_WH: 'received_nbs_wh'
} as const;

export type POStatus = typeof PO_STATUSES[keyof typeof PO_STATUSES];

interface POStatusTrackerProps {
  po: {
    id: string;
    number: string;
    status: POStatus;
    sentAt?: Date;
    acknowledgedAt?: Date;
    estimatedShipmentDate?: Date;
    trackingNumber?: string;
    carrierName?: string;
    deliveredAt?: Date;
    damageReportDeadline?: Date;
    damageReportSent?: boolean;
    invoiceMatchedAt?: Date;
    nbsWarehouseReceivedAt?: Date;
    statusHistory?: Array<{
      timestamp: string;
      fromStatus?: string;
      toStatus: string;
      userId?: string;
      reason?: string;
      metadata?: any;
    }>;
  };
  onStatusUpdate?: (newStatus: POStatus, metadata?: any) => void;
}

const STATUS_CONFIG = {
  [PO_STATUSES.DRAFT]: {
    label: 'Draft',
    color: 'bg-gray-500',
    icon: Clock,
    step: 1,
    description: 'Purchase order being prepared'
  },
  [PO_STATUSES.SENT]: {
    label: 'Sent to Vendor',
    color: 'bg-blue-500',
    icon: ExternalLink,
    step: 2,
    description: 'Awaiting vendor acknowledgment'
  },
  [PO_STATUSES.PENDING_SHIPMENT]: {
    label: 'Pending Shipment',
    color: 'bg-yellow-500',
    icon: Package,
    step: 3,
    description: 'Vendor acknowledged, preparing to ship'
  },
  [PO_STATUSES.PENDING_DELIVERY]: {
    label: 'In Transit',
    color: 'bg-orange-500',
    icon: Truck,
    step: 4,
    description: 'Materials shipped, tracking available'
  },
  [PO_STATUSES.DELIVERED]: {
    label: 'Delivered',
    color: 'bg-green-500',
    icon: CheckCircle,
    step: 5,
    description: 'Materials received on site'
  },
  [PO_STATUSES.MATCHED_PENDING_PAYMENT]: {
    label: 'Invoice Matched',
    color: 'bg-purple-500',
    icon: DollarSign,
    step: 6,
    description: 'Invoice processed, awaiting payment'
  },
  [PO_STATUSES.RECEIVED_NBS_WH]: {
    label: 'In NBS Warehouse',
    color: 'bg-indigo-500',
    icon: Warehouse,
    step: 7,
    description: 'Materials in warehouse, ready for distribution'
  }
};

export function POStatusTracker({ po, onStatusUpdate }: POStatusTrackerProps) {
  const currentConfig = STATUS_CONFIG[po.status];
  const progressPercentage = (currentConfig.step / 7) * 100;

  const getStatusBadgeVariant = (status: POStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case PO_STATUSES.DRAFT:
        return "outline";
      case PO_STATUSES.SENT:
        return "secondary";
      case PO_STATUSES.PENDING_SHIPMENT:
      case PO_STATUSES.PENDING_DELIVERY:
        return "default";
      case PO_STATUSES.DELIVERED:
      case PO_STATUSES.MATCHED_PENDING_PAYMENT:
      case PO_STATUSES.RECEIVED_NBS_WH:
        return "default";
      default:
        return "outline";
    }
  };

  const renderTrackingInfo = () => {
    if (po.trackingNumber && po.carrierName) {
      return (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <Truck className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Tracking: {po.trackingNumber}
            </p>
            <p className="text-xs text-blue-700">Carrier: {po.carrierName}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderDamageReportStatus = () => {
    if (po.status === PO_STATUSES.DELIVERED && po.damageReportDeadline) {
      const isExpired = new Date() > new Date(po.damageReportDeadline);
      return (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          isExpired ? 'bg-green-50' : 'bg-yellow-50'
        }`}>
          {isExpired ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          )}
          <div>
            <p className={`text-sm font-medium ${
              isExpired ? 'text-green-900' : 'text-yellow-900'
            }`}>
              {isExpired ? 'Damage Report Period Expired' : 'Damage Report Window Open'}
            </p>
            <p className={`text-xs ${
              isExpired ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {isExpired 
                ? 'Materials accepted in good condition' 
                : `Report deadline: ${format(new Date(po.damageReportDeadline), 'MMM d, yyyy h:mm a')}`
              }
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderStatusActions = () => {
    const actions = [];

    switch (po.status) {
      case PO_STATUSES.DRAFT:
        actions.push(
          <Button 
            key="send"
            onClick={() => onStatusUpdate?.(PO_STATUSES.SENT)}
            size="sm"
            data-testid="button-send-po"
          >
            Send to Vendor
          </Button>
        );
        break;

      case PO_STATUSES.SENT:
        actions.push(
          <Button 
            key="acknowledge"
            onClick={() => onStatusUpdate?.(PO_STATUSES.PENDING_SHIPMENT)}
            size="sm"
            variant="outline"
            data-testid="button-mark-acknowledged"
          >
            Mark Acknowledged
          </Button>
        );
        break;

      case PO_STATUSES.PENDING_SHIPMENT:
        actions.push(
          <Button 
            key="shipped"
            onClick={() => onStatusUpdate?.(PO_STATUSES.PENDING_DELIVERY)}
            size="sm"
            variant="outline"
            data-testid="button-add-tracking"
          >
            Add Tracking Info
          </Button>
        );
        break;

      case PO_STATUSES.PENDING_DELIVERY:
        actions.push(
          <Button 
            key="delivered"
            onClick={() => onStatusUpdate?.(PO_STATUSES.DELIVERED)}
            size="sm"
            variant="outline"
            data-testid="button-mark-delivered"
          >
            Mark Delivered
          </Button>
        );
        break;

      case PO_STATUSES.DELIVERED:
        actions.push(
          <Button 
            key="invoice"
            onClick={() => onStatusUpdate?.(PO_STATUSES.MATCHED_PENDING_PAYMENT)}
            size="sm"
            variant="outline"
            data-testid="button-match-invoice"
          >
            Match Invoice
          </Button>,
          <Button 
            key="warehouse"
            onClick={() => onStatusUpdate?.(PO_STATUSES.RECEIVED_NBS_WH)}
            size="sm"
            variant="outline"
            data-testid="button-move-warehouse"
          >
            Move to NBS Warehouse
          </Button>
        );
        break;
    }

    return actions.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {actions}
      </div>
    ) : null;
  };

  const StatusIcon = currentConfig.icon;

  return (
    <Card data-testid={`po-status-tracker-${po.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${currentConfig.color} text-white`}>
              <StatusIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg">PO {po.number}</CardTitle>
              <CardDescription>{currentConfig.description}</CardDescription>
            </div>
          </div>
          <Badge 
            variant={getStatusBadgeVariant(po.status)}
            data-testid={`status-badge-${po.status}`}
          >
            {currentConfig.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Progress</span>
            <span>Step {currentConfig.step} of 7</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2"
            data-testid="po-progress-bar"
          />
        </div>

        <Separator />

        {/* Key Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {po.sentAt && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Sent: {format(new Date(po.sentAt), 'MMM d, yyyy')}</span>
            </div>
          )}
          
          {po.acknowledgedAt && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Acknowledged: {format(new Date(po.acknowledgedAt), 'MMM d, yyyy')}</span>
            </div>
          )}
          
          {po.estimatedShipmentDate && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-600" />
              <span>Est. Ship: {format(new Date(po.estimatedShipmentDate), 'MMM d, yyyy')}</span>
            </div>
          )}
          
          {po.deliveredAt && (
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              <span>Delivered: {format(new Date(po.deliveredAt), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {/* Tracking Information */}
        {renderTrackingInfo()}

        {/* Damage Report Status */}
        {renderDamageReportStatus()}

        <Separator />

        {/* Action Buttons */}
        {renderStatusActions()}

        {/* Status History */}
        {po.statusHistory && po.statusHistory.length > 0 && (
          <details className="mt-4">
            <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              <Info className="h-4 w-4" />
              Status History ({po.statusHistory.length} updates)
            </summary>
            <div className="mt-2 space-y-2 pl-6">
              {po.statusHistory.map((entry, index) => (
                <div key={index} className="text-xs text-muted-foreground border-l-2 border-muted pl-3">
                  <div className="font-medium">
                    {entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : entry.toStatus}
                  </div>
                  <div>{format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}</div>
                  {entry.reason && (
                    <div className="italic">{entry.reason}</div>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}