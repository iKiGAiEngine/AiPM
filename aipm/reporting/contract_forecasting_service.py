def compute_row(
    db,
    project_id,
    cc,
    include_pending=True,
    period=None,
    use_alt_I_when_no_G_override=False
):
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
if A < B:
    G = Q(0)
if G < 0:
    G = Q(0)

# H — Cost To Complete Unposted PCIs: (F - Advanced SCOs)
H = F_adj - q_advance_scos(db, project_id, cc["id"])
if H < 0:
    H = Q(0)

# I — Cost Forecast
I = C + G + H
# Optional alternate formula when there's no manual override of G: I = A + F
if use_alt_I_when_no_G_override:
    I = A + F_adj

# J/K/L/M (revenue)
J = q_budget_plus_approvedCO(db, project_id, cc["id"])  # mirroring "Current Revenue Budget"
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
    A=A,
    B=B,
    C=C,
    cur=cur,
    D_int=D_int,
    E_ext=E_ext,
    F_adj=F_adj,
    G_ctc=G,
    H_ctc_unposted=H,
    I_cost_fcst=I,
    J_rev_budget=J,
    K_unposted_rev=K,
    L_unposted_rev_adj=L,
    M_rev_fcst=M,
    N_gain_loss=N
)
