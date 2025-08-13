import { useState } from "react";
import DashboardStats from "@/components/dashboard/DashboardStats";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentActivity from "@/components/dashboard/RecentActivity";
import BudgetOverview from "@/components/dashboard/BudgetOverview";
import VendorPerformance from "@/components/dashboard/VendorPerformance";

import QuoteAnalysisMatrix from "@/components/quotes/QuoteAnalysisMatrix";
import InvoiceProcessing from "@/components/invoices/InvoiceProcessing";

export default function Dashboard() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Dashboard Overview */}
      <DashboardStats />

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
      </div>

      {/* Budget Overview & Project Progress */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <BudgetOverview />
        <VendorPerformance />
      </div>

      {/* Quote Analysis Matrix (Demo) */}
      <QuoteAnalysisMatrix />

      {/* Invoice Processing & 3-Way Match */}
      <InvoiceProcessing />
    </div>
  );
}
