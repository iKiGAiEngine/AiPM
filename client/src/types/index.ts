export * from '@shared/schema';

export interface DashboardStats {
  openRequisitions: number;
  pendingPOs: number;
  invoiceExceptions: number;
  costSavings: string;
}

export interface ActivityItem {
  id: string;
  type: 'approval' | 'exception' | 'delivery' | 'requisition';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

export interface BudgetZone {
  id: string;
  name: string;
  budget: number;
  committed: number;
  actual: number;
  completionPercentage: number;
  variance: number;
}

export interface VendorPerformance {
  id: string;
  name: string;
  category: string;
  initials: string;
  onTimePercent: number;
  avgResponseTime: string;
}

export interface SearchResult {
  id: string;
  type: 'project' | 'po' | 'vendor' | 'material';
  title: string;
  subtitle: string;
  url: string;
}

export interface QuoteAnalysisLine {
  id: string;
  description: string;
  sku: string;
  quantity: number;
  vendors: {
    [vendorId: string]: {
      unitPrice: number;
      leadTime: string;
      total: number;
      isBest?: boolean;
    };
  };
  selectedVendorId?: string;
}

export interface InvoiceMatchResult {
  matched: boolean;
  poNumber?: string;
  deliveryNumber?: string;
  poVariance?: number;
  deliveryVariance?: number;
  exceptions?: string[];
}
