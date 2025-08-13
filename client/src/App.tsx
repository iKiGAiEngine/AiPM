import { useState } from "react";
import { Route, Switch, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Requisitions from "@/pages/Requisitions";
import NewRequisition from "@/pages/NewRequisition";
import RFQs from "@/pages/RFQs";
import NewRFQ from "@/pages/NewRFQ";
import PurchaseOrders from "@/pages/PurchaseOrders";
import Deliveries from "@/pages/Deliveries";
import Invoices from "@/pages/Invoices";
import InvoiceDetail from "@/pages/InvoiceDetail";
import InvoiceUpload from "@/pages/InvoiceUpload";
import Materials from "@/pages/Materials";
import NewMaterial from "@/pages/NewMaterial";
import ImportMaterials from "@/pages/ImportMaterials";
import Vendors from "@/pages/Vendors";
import Projects from "@/pages/Projects";
import NewProject from "@/pages/NewProject";
import EditProject from "@/pages/EditProject";
import NewPurchaseOrder from "@/pages/NewPurchaseOrder";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectMaterialUpload from "@/pages/ProjectMaterialUpload";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/Sidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import MobileNav from "@/components/layout/MobileNav";
import GlobalSearch from "@/components/layout/GlobalSearch";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
    return <Redirect to="/login" />;
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
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="min-h-screen bg-background">
          <Switch>
            <Route path="/login">
              <PublicRoute>
                <Login />
              </PublicRoute>
            </Route>
            
            <Route path="/dashboard">
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </Route>
            
            <Route path="/requisitions" nest>
              <Switch>
                <Route path="/new">
                  <ProtectedRoute>
                    <NewRequisition />
                  </ProtectedRoute>
                </Route>
                <Route>
                  <ProtectedRoute>
                    <Requisitions />
                  </ProtectedRoute>
                </Route>
              </Switch>
            </Route>
            
            <Route path="/rfqs" nest>
              <Switch>
                <Route path="/new">
                  <ProtectedRoute>
                    <NewRFQ />
                  </ProtectedRoute>
                </Route>
                <Route>
                  <ProtectedRoute>
                    <RFQs />
                  </ProtectedRoute>
                </Route>
              </Switch>
            </Route>
            
            <Route path="/purchase-orders" nest>
              <Switch>
                <Route path="/new">
                  <ProtectedRoute>
                    <NewPurchaseOrder />
                  </ProtectedRoute>
                </Route>
                <Route>
                  <ProtectedRoute>
                    <PurchaseOrders />
                  </ProtectedRoute>
                </Route>
              </Switch>
            </Route>
            
            <Route path="/deliveries">
              <ProtectedRoute>
                <Deliveries />
              </ProtectedRoute>
            </Route>
            
            <Route path="/invoices" nest>
              <Switch>
                <Route path="/upload">
                  <ProtectedRoute>
                    <InvoiceUpload />
                  </ProtectedRoute>
                </Route>
                <Route path="/:id">
                  {(params) => (
                    <ProtectedRoute>
                      <InvoiceDetail />
                    </ProtectedRoute>
                  )}
                </Route>
                <Route>
                  <ProtectedRoute>
                    <Invoices />
                  </ProtectedRoute>
                </Route>
              </Switch>
            </Route>
            
            <Route path="/materials" nest>
              <Switch>
                <Route path="/new">
                  <ProtectedRoute>
                    <NewMaterial />
                  </ProtectedRoute>
                </Route>
                <Route path="/import">
                  <ProtectedRoute>
                    <ImportMaterials />
                  </ProtectedRoute>
                </Route>
                <Route>
                  <ProtectedRoute>
                    <Materials />
                  </ProtectedRoute>
                </Route>
              </Switch>
            </Route>
            
            <Route path="/vendors">
              <ProtectedRoute>
                <Vendors />
              </ProtectedRoute>
            </Route>
            
            <Route path="/projects" nest>
              <Switch>
                <Route path="/new">
                  <ProtectedRoute>
                    <NewProject />
                  </ProtectedRoute>
                </Route>
                <Route path="/:id" nest>
                  <Switch>
                    <Route path="/edit">
                      {(params) => (
                        <ProtectedRoute>
                          <EditProject />
                        </ProtectedRoute>
                      )}
                    </Route>
                    <Route path="/materials/upload">
                      {(params) => (
                        <ProtectedRoute>
                          <ProjectMaterialUpload />
                        </ProtectedRoute>
                      )}
                    </Route>
                    <Route>
                      {(params) => (
                        <ProtectedRoute>
                          <ProjectDetail />
                        </ProtectedRoute>
                      )}
                    </Route>
                  </Switch>
                </Route>
                <Route>
                  <ProtectedRoute>
                    <Projects />
                  </ProtectedRoute>
                </Route>
              </Switch>
            </Route>
            
            <Route path="/reports">
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            </Route>
            
            <Route path="/settings">
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            </Route>
            
            <Route path="/">
              <Redirect to="/dashboard" />
            </Route>
            
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </div>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
