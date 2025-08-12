export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchParams {
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  status?: string;
  projectId?: string;
  vendorId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DashboardStats {
  openRequisitions: number;
  pendingPOs: number;
  invoiceExceptions: number;
  costSavings: string;
  totalProjects: number;
  activeProjects: number;
}

export interface SearchResult {
  id: string;
  type: 'project' | 'vendor' | 'purchase_order' | 'material' | 'requisition' | 'rfq' | 'invoice';
  name?: string;
  number?: string;
  description?: string;
  company?: string;
  sku?: string;
  manufacturer?: string;
  totalAmount?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface OCRResult {
  text: string;
  vendor?: string;
  invoiceNumber?: string;
  poNumber?: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    sku?: string;
  }>;
  totals?: {
    subtotal: number;
    tax: number;
    freight?: number;
    total: number;
  };
  confidence: number;
}
