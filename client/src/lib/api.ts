import { apiRequest } from './queryClient';
import type { 
  Project, Material, Vendor, Requisition, RFQ, PurchaseOrder, 
  Delivery, Invoice, Notification, DashboardStats 
} from '@/types';

export class ApiService {
  // Dashboard
  static async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiRequest('GET', '/api/v1/dashboard/stats');
    return response.json();
  }

  // Projects
  static async getProjects(): Promise<Project[]> {
    const response = await apiRequest('GET', '/api/v1/projects');
    return response.json();
  }

  static async getProject(id: string): Promise<Project> {
    const response = await apiRequest('GET', `/api/v1/projects/${id}`);
    return response.json();
  }

  static async getProjectZones(id: string): Promise<any[]> {
    const response = await apiRequest('GET', `/api/v1/projects/${id}/zones`);
    return response.json();
  }

  // Materials
  static async getMaterials(search?: string): Promise<Material[]> {
    const url = search ? `/api/v1/materials?search=${encodeURIComponent(search)}` : '/api/v1/materials';
    const response = await apiRequest('GET', url);
    return response.json();
  }

  static async createMaterial(data: any): Promise<Material> {
    const response = await apiRequest('POST', '/api/v1/materials', data);
    return response.json();
  }

  // Vendors
  static async getVendors(): Promise<Vendor[]> {
    const response = await apiRequest('GET', '/api/v1/vendors');
    return response.json();
  }

  static async createVendor(data: any): Promise<Vendor> {
    const response = await apiRequest('POST', '/api/v1/vendors', data);
    return response.json();
  }

  static async getVendorScorecard(id: string): Promise<any> {
    const response = await apiRequest('GET', `/api/v1/vendors/${id}/scorecard`);
    return response.json();
  }

  // Requisitions
  static async getRequisitions(): Promise<Requisition[]> {
    const response = await apiRequest('GET', '/api/v1/requisitions');
    return response.json();
  }

  static async createRequisition(data: any): Promise<Requisition> {
    const response = await apiRequest('POST', '/api/v1/requisitions', data);
    return response.json();
  }

  static async submitRequisition(id: string): Promise<Requisition> {
    const response = await apiRequest('POST', `/api/v1/requisitions/${id}/submit`);
    return response.json();
  }

  static async approveRequisition(id: string): Promise<Requisition> {
    const response = await apiRequest('POST', `/api/v1/requisitions/${id}/approve`);
    return response.json();
  }

  // RFQs
  static async getRFQs(): Promise<RFQ[]> {
    const response = await apiRequest('GET', '/api/v1/rfqs');
    return response.json();
  }

  static async createRFQ(data: any): Promise<RFQ> {
    const response = await apiRequest('POST', '/api/v1/rfqs', data);
    return response.json();
  }

  // Purchase Orders
  static async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const response = await apiRequest('GET', '/api/v1/purchase-orders');
    return response.json();
  }

  static async createPurchaseOrder(data: any): Promise<PurchaseOrder> {
    const response = await apiRequest('POST', '/api/v1/purchase-orders', data);
    return response.json();
  }

  // Deliveries
  static async getDeliveries(): Promise<Delivery[]> {
    const response = await apiRequest('GET', '/api/v1/deliveries');
    return response.json();
  }

  static async createDelivery(data: any): Promise<Delivery> {
    const response = await apiRequest('POST', '/api/v1/deliveries', data);
    return response.json();
  }

  static async processOCR(imageUrl?: string, pdfUrl?: string): Promise<any> {
    const response = await apiRequest('POST', '/api/v1/deliveries/ocr', { imageUrl, pdfUrl });
    return response.json();
  }

  // Invoices
  static async getInvoices(): Promise<Invoice[]> {
    const response = await apiRequest('GET', '/api/v1/invoices');
    return response.json();
  }

  static async createInvoice(data: any): Promise<Invoice> {
    const response = await apiRequest('POST', '/api/v1/invoices', data);
    return response.json();
  }

  static async matchInvoice(id: string): Promise<any> {
    const response = await apiRequest('POST', `/api/v1/invoices/${id}/match`);
    return response.json();
  }

  static async approveInvoice(id: string): Promise<Invoice> {
    const response = await apiRequest('POST', `/api/v1/invoices/${id}/approve`);
    return response.json();
  }

  // Search
  static async search(query: string): Promise<any[]> {
    const response = await apiRequest('GET', `/api/v1/search?q=${encodeURIComponent(query)}`);
    return response.json();
  }

  // Notifications
  static async getNotifications(): Promise<Notification[]> {
    const response = await apiRequest('GET', '/api/v1/notifications');
    return response.json();
  }

  static async markNotificationRead(id: string): Promise<void> {
    await apiRequest('POST', `/api/v1/notifications/${id}/read`);
  }

  // File Upload
  static async uploadFile(file: File): Promise<{ url: string; id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/v1/files/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (!response.ok) {
      throw new Error('File upload failed');
    }

    return response.json();
  }
}
