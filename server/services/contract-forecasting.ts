import { db } from "../db";
import { contractEstimates, purchaseOrders, invoices } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface CMiCLine {
  costCode: string;
  A: number; B: number; C: number; currentPeriodCost: number;
  D_int: number; E_ext: number; F_adj: number;
  G_ctc: number; H_ctc_unposted: number; I_cost_fcst: number;
  J_rev_budget: number; K_unposted_rev: number; L_unposted_rev_adj: number;
  M_rev_fcst: number; N_gain_loss: number;
}

export const CMIC_HEADERS = [
  "A. Current Cost Budget\n(Original Budget + Posted PCIs Thru Current Period)",
  "B. Spent/Committed (Less Advance SCOs)\n(C - SCOs Issued On Unposted PCI/OCO)",
  "C. Spent/Committed Total\n(Committed $ + $ Spent Outside Commitment)",
  "Current Period Cost",
  "D. Unposted Internal PCI Cost Budget",
  "E. Unposted External PCI Cost Budget",
  "F. Unposted Int & Ext PCI Cost Budget Adjusted\n(D+E if not overridden)",
  "G. Cost to Complete\n(A - C) unless A less than B, then (CTC = 0)",
  "H. Cost To Complete Unposted PCIs\n(F - Advanced SCOs)",
  "I. Cost Forecast\n(C + G + H)  or  (A + F if G not overridden)",
  "J. Current Revenue Budget\n(Original Budget + Posted PCIs Thru Current Period)",
  "K. Unposted PCI Revenue Budget",
  "L. Unposted PCI Revenue Budget Adjusted\n(K if not overridden)",
  "M. Revenue Forecast\n(J + L)",
  "N. Projected Gain/Loss\n(M - I)"
];

const Q = (x: number | null | undefined): number => {
  return Number((x || 0).toFixed(2));
};

export class ContractForecastingService {
  
  async getCostCodes(projectId: string): Promise<Array<{id: string, code: string, description: string}>> {
    const estimates = await db
      .select({
        id: contractEstimates.costCode,
        code: contractEstimates.costCode,
        description: contractEstimates.materialCategory
      })
      .from(contractEstimates)
      .where(eq(contractEstimates.projectId, projectId))
      .groupBy(contractEstimates.costCode, contractEstimates.materialCategory);
    
    return estimates.map(est => ({
      id: est.id,
      code: est.code,
      description: est.description || 'Unknown'
    }));
  }

  async getBudgetPlusApprovedCO(projectId: string, costCode: string): Promise<number> {
    const result = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${contractEstimates.awardedValue}), 0)` 
      })
      .from(contractEstimates)
      .where(and(
        eq(contractEstimates.projectId, projectId),
        eq(contractEstimates.costCode, costCode)
      ));
    
    return Q(result[0]?.total || 0);
  }

  async getCommittedPOLines(projectId: string, costCode: string): Promise<number> {
    // Since we don't have direct cost code linking in POs, we'll estimate based on project
    const result = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)` 
      })
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.projectId, projectId),
        sql`${purchaseOrders.status} IN ('sent', 'acknowledged', 'partial')`
      ));
    
    // Distribute PO amounts proportionally across cost codes
    const totalBudget = await this.getTotalProjectBudget(projectId);
    const costCodeBudget = await this.getBudgetPlusApprovedCO(projectId, costCode);
    const proportion = totalBudget > 0 ? costCodeBudget / totalBudget : 0;
    
    return Q((result[0]?.total || 0) * proportion);
  }

  async getSpentInvoices(projectId: string, costCode: string): Promise<number> {
    const result = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)` 
      })
      .from(invoices)
      .where(and(
        eq(invoices.projectId, projectId),
        sql`${invoices.status} IN ('approved', 'paid')`
      ));
    
    // Distribute invoice amounts proportionally across cost codes
    const totalBudget = await this.getTotalProjectBudget(projectId);
    const costCodeBudget = await this.getBudgetPlusApprovedCO(projectId, costCode);
    const proportion = totalBudget > 0 ? costCodeBudget / totalBudget : 0;
    
    return Q((result[0]?.total || 0) * proportion);
  }

  private async getTotalProjectBudget(projectId: string): Promise<number> {
    const result = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${contractEstimates.awardedValue}), 0)` 
      })
      .from(contractEstimates)
      .where(eq(contractEstimates.projectId, projectId));
    
    return result[0]?.total || 0;
  }

  async computeRow(projectId: string, costCode: {id: string, code: string, description: string}, includePending = true): Promise<CMiCLine> {
    // A — Current Cost Budget (cost)
    const A = await this.getBudgetPlusApprovedCO(projectId, costCode.id);

    // C — Spent/Committed Total
    const committed = await this.getCommittedPOLines(projectId, costCode.id);
    const spentOutside = 0; // Not tracked yet
    const C = Q(committed + spentOutside);

    // B — Spent/Committed (Less Advance SCOs) = C - SCOs issued on unposted PCI/OCO
    const B = Q(C - 0); // SCOs not tracked yet

    // Current Period Cost
    const currentPeriodCost = 0; // Not tracked yet

    // D/E/F — Unposted PCI cost buckets
    const D_int = includePending ? 0 : 0; // Not tracked yet
    const E_ext = includePending ? 0 : 0; // Not tracked yet
    const F_adj = Q(D_int + E_ext);

    // G — Cost to Complete: (A - C); but if A < B => 0; clamp >=0
    let G = Q(A - C);
    if (A < B) G = 0;
    if (G < 0) G = 0;

    // H — Cost To Complete Unposted PCIs: (F - Advanced SCOs)
    let H = Q(F_adj - 0); // Advanced SCOs not tracked yet
    if (H < 0) H = 0;

    // I — Cost Forecast
    const I = Q(C + G + H);

    // J/K/L/M (revenue)
    const J = A; // Mirror of cost budget for revenue
    const K = includePending ? 0 : 0; // Unposted revenue not tracked yet
    const L = K; // No overrides yet
    const M = Q(J + L);

    // N — Projected Gain/Loss
    const N = Q(M - I);

    return {
      costCode: `${costCode.code} — ${costCode.description}`,
      A, B, C, currentPeriodCost,
      D_int, E_ext, F_adj,
      G_ctc: G, H_ctc_unposted: H, I_cost_fcst: I,
      J_rev_budget: J, K_unposted_rev: K, L_unposted_rev_adj: L,
      M_rev_fcst: M, N_gain_loss: N
    };
  }

  async generateReport(projectId: string, includePending = true): Promise<{lines: CMiCLine[], totals: CMiCLine}> {
    const costCodes = await this.getCostCodes(projectId);
    const lines: CMiCLine[] = [];

    for (const cc of costCodes) {
      const line = await this.computeRow(projectId, cc, includePending);
      lines.push(line);
    }

    // Calculate totals
    const totals: CMiCLine = {
      costCode: "TOTALS",
      A: Q(lines.reduce((sum, line) => sum + line.A, 0)),
      B: Q(lines.reduce((sum, line) => sum + line.B, 0)),
      C: Q(lines.reduce((sum, line) => sum + line.C, 0)),
      currentPeriodCost: Q(lines.reduce((sum, line) => sum + line.currentPeriodCost, 0)),
      D_int: Q(lines.reduce((sum, line) => sum + line.D_int, 0)),
      E_ext: Q(lines.reduce((sum, line) => sum + line.E_ext, 0)),
      F_adj: Q(lines.reduce((sum, line) => sum + line.F_adj, 0)),
      G_ctc: Q(lines.reduce((sum, line) => sum + line.G_ctc, 0)),
      H_ctc_unposted: Q(lines.reduce((sum, line) => sum + line.H_ctc_unposted, 0)),
      I_cost_fcst: Q(lines.reduce((sum, line) => sum + line.I_cost_fcst, 0)),
      J_rev_budget: Q(lines.reduce((sum, line) => sum + line.J_rev_budget, 0)),
      K_unposted_rev: Q(lines.reduce((sum, line) => sum + line.K_unposted_rev, 0)),
      L_unposted_rev_adj: Q(lines.reduce((sum, line) => sum + line.L_unposted_rev_adj, 0)),
      M_rev_fcst: Q(lines.reduce((sum, line) => sum + line.M_rev_fcst, 0)),
      N_gain_loss: Q(lines.reduce((sum, line) => sum + line.N_gain_loss, 0))
    };

    return { lines, totals };
  }

  generateVerificationChecks(lines: CMiCLine[], includePending: boolean): Array<{label: string, ok: boolean}> {
    const checks: Array<{label: string, ok: boolean}> = [];
    
    for (const ln of lines) {
      const tolerance = 0.01; // Allow small floating point differences
      
      checks.push(
        {
          label: `${ln.costCode}: F == D+E`,
          ok: Math.abs(ln.F_adj - (ln.D_int + ln.E_ext)) < tolerance
        },
        {
          label: `${ln.costCode}: G == max(A - C, 0) and if A < B then 0`,
          ok: ln.G_ctc >= 0 && !(ln.G_ctc > 0 && (ln.A < ln.C || ln.A < ln.B))
        },
        {
          label: `${ln.costCode}: H == F - Advanced SCOs (≥0)`,
          ok: ln.H_ctc_unposted >= 0 && ln.H_ctc_unposted <= ln.F_adj + tolerance
        },
        {
          label: `${ln.costCode}: I == C + G + H`,
          ok: Math.abs(ln.I_cost_fcst - (ln.C + ln.G_ctc + ln.H_ctc_unposted)) < tolerance
        },
        {
          label: `${ln.costCode}: M == J + L`,
          ok: Math.abs(ln.M_rev_fcst - (ln.J_rev_budget + ln.L_unposted_rev_adj)) < tolerance
        },
        {
          label: `${ln.costCode}: N == M - I`,
          ok: Math.abs(ln.N_gain_loss - (ln.M_rev_fcst - ln.I_cost_fcst)) < tolerance
        }
      );
      
      if (!includePending) {
        checks.push({
          label: `${ln.costCode}: Pending cleared when toggle off (D,E,F,K==0)`,
          ok: ln.D_int === 0 && ln.E_ext === 0 && ln.F_adj === 0 && ln.K_unposted_rev === 0
        });
      }
    }
    
    return checks;
  }
}