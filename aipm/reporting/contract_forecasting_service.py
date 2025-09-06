from decimal import Decimal
from dataclasses import dataclass

D = Decimal
Q = lambda x: D(str(x or 0)).quantize(D("0.01"))

# === CMiC-aligned headers (exact text, line breaks kept) ===
CMIC_HEADERS = [
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
]

# Data row
@dataclass
class Line:
    cost_code: str
    A: D; B: D; C: D; cur: D
    D_int: D; E_ext: D; F_adj: D
    G_ctc: D; H_ctc_unposted: D; I_cost_fcst: D
    J_rev_budget: D; K_unposted_rev: D; L_unposted_rev_adj: D
    M_rev_fcst: D; N_gain_loss: D

# Database connection helper - use Drizzle connection for consistency
import os
import sys
sys.path.append('/home/runner/workspace')

def get_db_connection():
    """Get database connection using the same settings as the main app"""
    import psycopg2
    from urllib.parse import urlparse
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL environment variable not set")
    
    # Parse the database URL
    parsed = urlparse(database_url)
    
    return psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path[1:] if parsed.path else '',  # Remove leading slash
        user=parsed.username,
        password=parsed.password
    )

def cc_list(db, project_id):
    """Get cost codes for the project (show even if no budget yet)"""
    cursor = db.cursor()
    cursor.execute("""
        SELECT DISTINCT ce.cost_code as id, ce.cost_code as code, ce.material_category as description
        FROM contract_estimates ce
        WHERE ce.project_id = %s
        UNION
        SELECT DISTINCT po.cost_code as id, po.cost_code as code, '' as description
        FROM purchase_orders po
        WHERE po.project_id = %s
        ORDER BY code
    """, (project_id, project_id))
    
    rows = cursor.fetchall()
    return [{"id": row[0], "code": row[1], "description": row[2]} for row in rows]


def q_budget_plus_approvedCO(db, project_id, ccid):
    """A & J: Original budget + approved change orders"""
    cursor = db.cursor()
    cursor.execute("""
        SELECT COALESCE(SUM(awarded_value), 0)
        FROM contract_estimates 
        WHERE project_id = %s AND cost_code = %s
    """, (project_id, ccid))
    
    result = cursor.fetchone()
    return Q(result[0] if result else 0)

def q_spent_invoices(db, project_id, ccid):
    """Posted/approved invoices for this cost code"""
    cursor = db.cursor()
    cursor.execute("""
        SELECT COALESCE(SUM(i.total_amount), 0)
        FROM invoices i
        JOIN purchase_orders po ON i.vendor_id = po.vendor_id
        JOIN contract_estimates ce ON po.project_id = ce.project_id
        WHERE i.project_id = %s 
        AND ce.cost_code = %s
        AND i.status IN ('approved', 'paid')
    """, (project_id, ccid))
    
    result = cursor.fetchone()
    return Q(result[0] if result else 0)

def q_committed_po_lines(db, project_id, ccid):
    """Open/partial purchase order commitments"""
    cursor = db.cursor()
    cursor.execute("""
        SELECT COALESCE(SUM(po.total_amount), 0)
        FROM purchase_orders po
        JOIN contract_estimates ce ON po.project_id = ce.project_id
        WHERE po.project_id = %s 
        AND ce.cost_code = %s
        AND po.status IN ('sent', 'acknowledged', 'partial')
    """, (project_id, ccid))
    
    result = cursor.fetchone()
    return Q(result[0] if result else 0)

def q_spent_outside_commitment(db, project_id, ccid):
    """Spending outside of purchase order commitments"""
    # For now, return 0 as this is typically tracked separately
    return Q(0)

def q_current_period_cost(db, project_id, ccid, period=None):
    """Cost posted in current period"""
    # For now, return 0 as period tracking isn't implemented yet
    return Q(0)

def q_unposted_internal_pci_cost(db, project_id, ccid):
    """D: Internal pending change orders"""
    # For now, return 0 as pending COs aren't implemented yet
    return Q(0)

def q_unposted_external_pci_cost(db, project_id, ccid):
    """E: External pending change orders"""
    # For now, return 0 as pending COs aren't implemented yet
    return Q(0)

def q_unposted_pci_revenue_budget(db, project_id, ccid):
    """K: Unposted revenue budget for pending COs"""
    # For now, return 0 as pending COs aren't implemented yet
    return Q(0)

# "Advance SCOs" & "SCOs Issued On Unposted PCI/OCO" hooks (default 0 if you don't track them yet)
def q_advance_scos(db, project_id, ccid):
    return Q(0)

def q_scos_issued_on_unposted(db, project_id, ccid):
    return Q(0)

def compute_row(db, project_id, cc, include_pending=True, period=None, use_alt_I_when_no_G_override=False):
    # A — Current Cost Budget (cost)
    A = q_budget_plus_approvedCO(db, project_id, cc["id"])

    # C — Spent/Committed Total
    committed = q_committed_po_lines(db, project_id, cc["id"])
    spent_outside = q_spent_outside_commitment(db, project_id, cc["id"])
    C = committed + spent_outside

    # B — Spent/Committed (Less Advance SCOs) = C - SCOs issued on unposted PCI/OCO
    B = C - q_scos_issued_on_unposted(db, project_id, cc["id"])

    # Current Period Cost
    cur = q_current_period_cost(db, project_id, cc["id"], period=period)

    # D/E/F — Unposted PCI cost buckets
    D_int = q_unposted_internal_pci_cost(db, project_id, cc["id"]) if include_pending else Q(0)
    E_ext = q_unposted_external_pci_cost(db, project_id, cc["id"]) if include_pending else Q(0)
    F_adj = D_int + E_ext  # allow UI overrides later

    # G — Cost to Complete: (A - C); but if A < B => 0; clamp >=0
    G = A - C
    if A < B: G = Q(0)
    if G < 0: G = Q(0)

    # H — Cost To Complete Unposted PCIs: (F - Advanced SCOs)
    H = F_adj - q_advance_scos(db, project_id, cc["id"])
    if H < 0: H = Q(0)

    # I — Cost Forecast
    I = C + G + H
    # Optional alternate formula when there's no manual override of G: I = A + F
    if use_alt_I_when_no_G_override:
        I = A + F_adj

    # J/K/L/M (revenue)
    J = q_budget_plus_approvedCO(db, project_id, cc["id"])            # mirroring "Current Revenue Budget"
    K = q_unposted_pci_revenue_budget(db, project_id, cc["id"]) if include_pending else Q(0)
    L = K  # adjustable via UI override later
    M = J + L

    # N — Projected Gain/Loss
    N = M - I

        # 🔍 Debugging: print cost code row details
    print(f"[DEBUG] Project {project_id} — Cost Code {cc['code']}: "
          f"A={A}, B={B}, C={C}, J={J}, M={M}, N={N}")
    
    return Line(
        cost_code=f'{cc["code"]} — {cc.get("description","")}',
        A=A, B=B, C=C, cur=cur,
        D_int=D_int, E_ext=E_ext, F_adj=F_adj,
        G_ctc=G, H_ctc_unposted=H, I_cost_fcst=I,
        J_rev_budget=J, K_unposted_rev=K, L_unposted_rev_adj=L,
        M_rev_fcst=M, N_gain_loss=N
    )
