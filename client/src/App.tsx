import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Requisitions from "@/pages/Requisitions";
import NewRequisition from "@/pages/NewRequisition";
import RequisitionView from "@/pages/RequisitionView";
import NewBuyout from "@/pages/NewBuyout";
import RFQs from "@/pages/RFQs";
import RFQView from "@/pages/RFQView";
import QuoteComparison from "@/pages/QuoteComparison";
import NewRFQ from "@/pages/NewRFQ";
import PurchaseOrders from "@/pages/PurchaseOrders";
import Deliveries from "@/pages/Deliveries";
import NewDelivery from "@/pages/NewDelivery";
import DeliveryView from "@/pages/DeliveryView";
import Invoices from "@/pages/Invoices";
import InvoiceDetail from "@/pages/InvoiceDetail";
import InvoiceUpload from "@/pages/InvoiceUpload";
import InvoiceView from "@/pages/InvoiceView";
import Materials from "@/pages/Materials";
import NewMaterial from "@/pages/NewMaterial";
import ImportMaterials from "@/pages/ImportMaterials";
import Vendors from "@/pages/Vendors";
import Projects from "@/pages/Projects";
import NewProject from "@/pages/NewProject";
import EditProject from "@/pages/EditProject";
import NewPurchaseOrder from "@/pages/NewPurchaseOrder";
import PurchaseOrderDetail from "@/pages/PurchaseOrderDetail";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectMaterials from "@/pages/ProjectMaterials";
import ProjectMaterialUpload from "@/pages/ProjectMaterialUpload";
import Reports from "@/pages/Reports";
import ContractForecasting from "@/pages/ContractForecasting";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/Sidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import MobileNav from "@/components/layout/MobileNav";
import GlobalSearch from "@/components/layout/GlobalSearch";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 lg:pl-64 flex flex-col overflow-hidden">
        <TopAppBar 
          onMobileMenuToggle={() => setIsMobileNavOpen(!isMobileNavOpen)}
          onGlobalSearchOpen={() => setIsGlobalSearchOpen(true)}
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
      <GlobalSearch isOpen={isGlobalSearchOpen} onClose={() => setIsGlobalSearchOpen(false)} />
    </div>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ProjectProvider>
          <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              {/* Requisitions routes */}
              <Route path="/requisitions/new" element={
                <ProtectedRoute>
                  <NewRequisition />
                </ProtectedRoute>
              } />
              <Route path="/requisitions/:id" element={
                <ProtectedRoute>
                  <RequisitionView />
                </ProtectedRoute>
              } />
              <Route path="/requisitions" element={
                <ProtectedRoute>
                  <Requisitions />
                </ProtectedRoute>
              } />
              
              {/* RFQ routes */}
              <Route path="/rfqs/new" element={
                <ProtectedRoute>
                  <NewRFQ />
                </ProtectedRoute>
              } />
              <Route path="/rfqs/:id/quotes" element={
                <ProtectedRoute>
                  <QuoteComparison />
                </ProtectedRoute>
              } />
              <Route path="/rfqs/:id" element={
                <ProtectedRoute>
                  <RFQView />
                </ProtectedRoute>
              } />
              <Route path="/rfqs" element={
                <ProtectedRoute>
                  <RFQs />
                </ProtectedRoute>
              } />
              
              {/* Buyout routes */}
              <Route path="/buyout/new" element={
                <ProtectedRoute>
                  <NewBuyout />
                </ProtectedRoute>
              } />
              
              {/* Purchase Orders routes */}
              <Route path="/purchase-orders/new" element={
                <ProtectedRoute>
                  <NewPurchaseOrder />
                </ProtectedRoute>
              } />
              <Route path="/purchase-orders/:id" element={
                <ProtectedRoute>
                  <PurchaseOrderDetail />
                </ProtectedRoute>
              } />
              <Route path="/purchase-orders" element={
                <ProtectedRoute>
                  <PurchaseOrders />
                </ProtectedRoute>
              } />
              
              {/* Deliveries */}
              <Route path="/deliveries/new" element={
                <ProtectedRoute>
                  <NewDelivery />
                </ProtectedRoute>
              } />
              <Route path="/deliveries/:id" element={
                <ProtectedRoute>
                  <DeliveryView />
                </ProtectedRoute>
              } />
              <Route path="/deliveries" element={
                <ProtectedRoute>
                  <Deliveries />
                </ProtectedRoute>
              } />
              
              {/* Invoice routes */}
              <Route path="/invoices/upload" element={
                <ProtectedRoute>
                  <InvoiceUpload />
                </ProtectedRoute>
              } />
              <Route path="/invoices/:id" element={
                <ProtectedRoute>
                  <InvoiceView />
                </ProtectedRoute>
              } />
              <Route path="/invoices" element={
                <ProtectedRoute>
                  <Invoices />
                </ProtectedRoute>
              } />
              
              {/* Materials routes */}
              <Route path="/materials/new" element={
                <ProtectedRoute>
                  <NewMaterial />
                </ProtectedRoute>
              } />
              <Route path="/materials/import" element={
                <ProtectedRoute>
                  <ImportMaterials />
                </ProtectedRoute>
              } />
              <Route path="/materials" element={
                <ProtectedRoute>
                  <Materials />
                </ProtectedRoute>
              } />
              
              {/* Vendors */}
              <Route path="/vendors" element={
                <ProtectedRoute>
                  <Vendors />
                </ProtectedRoute>
              } />
              
              {/* Projects routes - EXPLICIT ORDER TO AVOID CONFLICTS */}
              <Route path="/projects/new" element={
                <ProtectedRoute>
                  <NewProject />
                </ProtectedRoute>
              } />
              <Route path="/projects/:id/edit" element={
                <ProtectedRoute>
                  <EditProject />
                </ProtectedRoute>
              } />
              <Route path="/projects/:id/materials/upload" element={
                <ProtectedRoute>
                  <ProjectMaterialUpload />
                </ProtectedRoute>
              } />
              <Route path="/projects/:id/materials" element={
                <ProtectedRoute>
                  <ProjectMaterials />
                </ProtectedRoute>
              } />
              <Route path="/projects/:id" element={
                <ProtectedRoute>
                  <ProjectDetail />
                </ProtectedRoute>
              } />
              <Route path="/projects" element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              } />
              
              {/* Reports and Settings */}
              <Route path="/reports" element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="/reports/contract-forecasting/:projectId" element={
                <ProtectedRoute>
                  <ContractForecasting />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              
              {/* Default route */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* 404 fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Toaster />
        </BrowserRouter>
        </ProjectProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}