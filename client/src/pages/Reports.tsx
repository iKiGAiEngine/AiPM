import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, Filter, Sparkles } from "lucide-react";

interface StageField {
  name: string;
  type:
    | "🔑 Primary Key"
    | "📌 Identifier"
    | "📍 Location"
    | "👤 Contact"
    | "💰 Financial"
    | "✅ Compliance"
    | "📋 Scope"
    | "📋 Notes"
    | "📁 Link"
    | "📅 Date"
    | "⚠️ Flag"
    | "📦 Material"
    | "🧾 Billing"
    | "📊 WIP"
    | "🔍 Audit"
    | "🚚 Logistics";
  note: string;
}

interface WorkflowStage {
  id: string;
  phase: string;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  colorSoft: string;
  colorBorder: string;
  description: string;
  trigger: string;
  module: string;
  fields: StageField[];
  forwardTo: string[];
}

const STAGES: WorkflowStage[] = [
  {
    id: "award_notification",
    phase: "01",
    label: "AWARD NOTIFICATION",
    sublabel: "Estimate Becomes Active Project",
    icon: "🏁",
    color: "#1F6FEB",
    colorSoft: "rgba(31,111,235,0.08)",
    colorBorder: "rgba(31,111,235,0.3)",
    description:
      "Formal award confirmation converts the estimate to an active NBS material-supply project and opens controlled downstream execution.",
    trigger: "Customer award confirmation and internal award intake",
    module: "Project Initiation",
    fields: [
      { name: "Award Date", type: "📅 Date", note: "Date project is officially awarded" },
      { name: "Awarded Value", type: "💰 Financial", note: "Contract amount tied to awarded estimate" },
      { name: "Estimate Reference", type: "📁 Link", note: "Source estimate workbook and version" },
      { name: "Customer Entity", type: "👤 Contact", note: "Awarding GC or owner account" },
    ],
    forwardTo: ["NTP & Contract", "Project Fields"],
  },
  {
    id: "ntp_contract",
    phase: "02",
    label: "NTP & CONTRACT",
    sublabel: "Authorization Gate",
    icon: "📜",
    color: "#155EEF",
    colorSoft: "rgba(21,94,239,0.08)",
    colorBorder: "rgba(21,94,239,0.3)",
    description:
      "Notice to Proceed and contract intake establish legal authorization. No procurement execution, submittal release, or PO issuance proceeds without this gate.",
    trigger: "Executed contract and NTP receipt",
    module: "Contract Controls",
    fields: [
      { name: "Contract ID", type: "🔑 Primary Key", note: "Legal agreement reference" },
      { name: "NTP Date", type: "📅 Date", note: "Date authorization to proceed is received" },
      { name: "Contract Value", type: "💰 Financial", note: "Total contracted material supply value" },
      { name: "Billing Terms", type: "🧾 Billing", note: "Stored and delivered billing terms" },
    ],
    forwardTo: ["Project Fields", "Procurement Buyout"],
  },
  {
    id: "project_fields",
    phase: "03",
    label: "PROJECT FIELDS",
    sublabel: "Source of Truth",
    icon: "🗂️",
    color: "#8C6BC1",
    colorSoft: "rgba(140,107,193,0.08)",
    colorBorder: "rgba(140,107,193,0.3)",
    description:
      "Central project record that stores all project-level, customer, shipping, tax, scope, and material-control fields used by downstream modules. This is the master source of truth for the project.",
    trigger: "Created immediately after NTP / contract intake and before buyout begins",
    module: "Project Setup / Master Project Fields",
    fields: [
      { name: "PV Number", type: "🔑 Primary Key", note: "Root ID that ties all modules together" },
      { name: "Project Name", type: "📌 Identifier", note: "Full project name used across all records" },
      { name: "Project Address", type: "📍 Location", note: "Jobsite address for tax, freight, and logistics" },
      { name: "Region", type: "📍 Location", note: "NBS operating region responsible for project" },
      { name: "GC Name", type: "👤 Contact", note: "Customer / general contractor" },
      { name: "GC PM Name + Contact", type: "👤 Contact", note: "Primary downstream communication contact" },
      { name: "Ship-To Address", type: "📍 Location", note: "Warehouse or direct-to-site delivery location" },
      { name: "Tax State", type: "💰 Financial", note: "State governing sales tax treatment" },
      { name: "Tax Rate", type: "💰 Financial", note: "Project tax rate used for audit and billing checks" },
      { name: "Material Supply Only", type: "✅ Compliance", note: "Always yes for NBS material-only workflow" },
      { name: "Included Scope Summary", type: "📋 Scope", note: "High-level list of included Division 10 sections" },
      { name: "Excluded Scope Summary", type: "📋 Notes", note: "Clear exclusions to avoid downstream confusion" },
      { name: "Estimate File Reference", type: "📁 Link", note: "Link back to original estimate workbook" },
      { name: "Required On Site Date", type: "📅 Date", note: "Date material is required on site" },
      { name: "Submittal Requirement Flag", type: "⚠️ Flag", note: "Indicates whether formal submittals are required before PO" },
    ],
    forwardTo: ["Procurement Buyout", "Submittal Process", "Purchase Orders"],
  },
  {
    id: "procurement_buyout",
    phase: "04",
    label: "PROCUREMENT BUYOUT",
    sublabel: "Internal Material Decision",
    icon: "🧮",
    color: "#7C3AED",
    colorSoft: "rgba(124,58,237,0.08)",
    colorBorder: "rgba(124,58,237,0.3)",
    description:
      "RFQs, quote comparisons, freight review, lead-time checks, and budget variance analysis culminate in internally approved manufacturer and product selections.",
    trigger: "NTP in hand and project fields established",
    module: "RFQ / Quote Analysis / Buyout Approval",
    fields: [
      { name: "Approved Manufacturer", type: "📦 Material", note: "Selected manufacturer by scope package" },
      { name: "Approved Product", type: "📦 Material", note: "Final product basis for submittals and POs" },
      { name: "Lead Time", type: "🚚 Logistics", note: "Quoted lead time validated with required on-site date" },
      { name: "Freight Strategy", type: "🚚 Logistics", note: "Freight assumptions and delivery path" },
      { name: "Buyout Variance vs Estimate", type: "💰 Financial", note: "Cost movement against estimate baseline" },
    ],
    forwardTo: ["Submittal Process"],
  },
  {
    id: "submittal_process",
    phase: "05",
    label: "SUBMITTAL PROCESS",
    sublabel: "Built from Approved Buyout Selections",
    icon: "📘",
    color: "#5B21B6",
    colorSoft: "rgba(91,33,182,0.08)",
    colorBorder: "rgba(91,33,182,0.3)",
    description:
      "Buyout occurs first. Internally approved material selections feed the submittal package. Required submittal approval must be received before PO issuance.",
    trigger: "Approved internal buyout selections available",
    module: "Submittal Register / Approval Tracking",
    fields: [
      { name: "Submittal Package ID", type: "🔑 Primary Key", note: "Version-controlled package record" },
      { name: "Product Decision Source", type: "📁 Link", note: "Reference to approved buyout recommendation" },
      { name: "Submission Date", type: "📅 Date", note: "Date package submitted to customer review" },
      { name: "Revision Round", type: "📌 Identifier", note: "Tracks review cycles and resubmittals" },
      { name: "Approval Status", type: "✅ Compliance", note: "Required approval state before PO release" },
    ],
    forwardTo: ["Purchase Orders"],
  },
  {
    id: "purchase_orders",
    phase: "06",
    label: "PURCHASE ORDERS",
    sublabel: "Legal Vendor Commitment",
    icon: "🧾",
    color: "#1D4ED8",
    colorSoft: "rgba(29,78,216,0.08)",
    colorBorder: "rgba(29,78,216,0.3)",
    description:
      "POs formalize vendor commitments and must align to project records, approved buyout decisions, and required submittal approvals before release.",
    trigger: "Required approvals complete and internal material approval confirmed",
    module: "PO Authoring / Vendor Commitment",
    fields: [
      { name: "PO Number", type: "🔑 Primary Key", note: "Controlling vendor commitment identifier" },
      { name: "Linked Submittal Approval", type: "✅ Compliance", note: "Required when formal submittals apply" },
      { name: "Required Material Delivery Date", type: "📅 Date", note: "Date material must arrive for project execution" },
      { name: "PO Committed Cost", type: "💰 Financial", note: "Committed material cost baseline" },
    ],
    forwardTo: ["Material Receiving"],
  },
  {
    id: "material_receiving",
    phase: "07",
    label: "MATERIAL RECEIVING",
    sublabel: "Physical Receipt Control",
    icon: "📦",
    color: "#0F766E",
    colorSoft: "rgba(15,118,110,0.08)",
    colorBorder: "rgba(15,118,110,0.3)",
    description:
      "Material is received at NBS warehouse or direct-to-site, validated against PO and packing slip, and documented for quantity, condition, shortages, and variances.",
    trigger: "Vendor shipment delivery event",
    module: "Receiving / Variance Tracking",
    fields: [
      { name: "Receipt ID", type: "🔑 Primary Key", note: "Receiving transaction identifier" },
      { name: "Received Quantity", type: "📦 Material", note: "Actual received quantity by PO line" },
      { name: "Damage or Shortage Flag", type: "⚠️ Flag", note: "Captures exception handling requirement" },
      { name: "Receiving Documentation", type: "🔍 Audit", note: "Packing slip and signed receipt evidence" },
    ],
    forwardTo: ["Vendor Invoice Processing", "Billing / AR"],
  },
  {
    id: "vendor_invoice_processing",
    phase: "08",
    label: "VENDOR INVOICE PROCESSING",
    sublabel: "3-Way Match + Tax Audit",
    icon: "🔍",
    color: "#0EA5E9",
    colorSoft: "rgba(14,165,233,0.08)",
    colorBorder: "rgba(14,165,233,0.3)",
    description:
      "Vendor invoices are validated through invoice-vs-PO-vs-receipt three-way matching, including tax treatment review and variance resolution before payment release.",
    trigger: "Vendor invoice submission",
    module: "AP Audit / Match Workflow",
    fields: [
      { name: "Invoice Number", type: "📌 Identifier", note: "Vendor invoice reference" },
      { name: "3-Way Match Result", type: "🔍 Audit", note: "Pass, tolerance review, or hold" },
      { name: "Tax Audit Result", type: "🔍 Audit", note: "Sales tax validation against project rules" },
      { name: "Approved Invoice Cost", type: "💰 Financial", note: "Audited cost approved for payment" },
    ],
    forwardTo: ["Billing / AR", "Cash Receipt & WIP"],
  },
  {
    id: "billing_ar",
    phase: "09",
    label: "BILLING / AR",
    sublabel: "Material-Only Customer Billing",
    icon: "📨",
    color: "#0891B2",
    colorSoft: "rgba(8,145,178,0.08)",
    colorBorder: "rgba(8,145,178,0.3)",
    description:
      "Customer billing is based on material value using stored and delivered material positions, approved billing schedule values, supporting documents, retention, and lien waiver controls.",
    trigger: "Billable stored or delivered material position achieved",
    module: "Customer Billing / AR",
    fields: [
      { name: "Stored Materials Value", type: "🧾 Billing", note: "Billable material value currently stored" },
      { name: "Delivered Materials Value", type: "🧾 Billing", note: "Billable delivered material value" },
      { name: "Retention Held", type: "🧾 Billing", note: "Customer-held retention balance" },
      { name: "Customer Invoice / Pay App Date", type: "📅 Date", note: "Submission and aging baseline" },
    ],
    forwardTo: ["Cash Receipt & WIP"],
  },
  {
    id: "cash_wip",
    phase: "10",
    label: "CASH RECEIPT & WIP",
    sublabel: "Material Cost and Margin Truth",
    icon: "💵",
    color: "#2563EB",
    colorSoft: "rgba(37,99,235,0.08)",
    colorBorder: "rgba(37,99,235,0.3)",
    description:
      "Cash collection and WIP reporting focus on committed and actual material cost, billed-to-date position, collected cash, and projected final material margin variance against estimate.",
    trigger: "Customer cash activity and periodic WIP cycle",
    module: "Cash Application / Material WIP",
    fields: [
      { name: "Committed Material Cost", type: "📊 WIP", note: "Current PO commitment for materials" },
      { name: "Invoiced Material Cost", type: "📊 WIP", note: "Approved vendor material cost to date" },
      { name: "Billed to Date", type: "🧾 Billing", note: "Total customer billing submitted" },
      { name: "Cash Received", type: "💰 Financial", note: "Collected customer cash to date" },
      { name: "Margin Variance vs Estimate", type: "📊 WIP", note: "Projected material margin movement" },
    ],
    forwardTo: ["Project Closeout"],
  },
  {
    id: "project_closeout",
    phase: "11",
    label: "PROJECT CLOSEOUT",
    sublabel: "Historical Intelligence Handoff",
    icon: "✅",
    color: "#16A34A",
    colorSoft: "rgba(22,163,74,0.08)",
    colorBorder: "rgba(22,163,74,0.3)",
    description:
      "Final billing, retention release, total collected cash, final job cost, final gross margin, and vendor performance outcomes are locked for operational learning and future estimating.",
    trigger: "All scope supplied, billed, and financially reconciled",
    module: "Closeout / Performance Archive",
    fields: [
      { name: "Final Contract Value", type: "💰 Financial", note: "Final approved contract amount" },
      { name: "Total Billed / Collected", type: "🧾 Billing", note: "Final AR and cash realization" },
      { name: "Final Job Cost", type: "📊 WIP", note: "Total material cost at closeout" },
      { name: "Final Gross Margin", type: "📊 WIP", note: "Actual project gross margin" },
      { name: "Vendor Performance Notes", type: "📋 Notes", note: "Future buyout intelligence" },
    ],
    forwardTo: [],
  },
];

const typeStyles: Record<StageField["type"], string> = {
  "🔑 Primary Key": "bg-blue-50 text-blue-700 border-blue-200",
  "📌 Identifier": "bg-slate-50 text-slate-700 border-slate-200",
  "📍 Location": "bg-orange-50 text-orange-700 border-orange-200",
  "👤 Contact": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "💰 Financial": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "✅ Compliance": "bg-green-50 text-green-700 border-green-200",
  "📋 Scope": "bg-violet-50 text-violet-700 border-violet-200",
  "📋 Notes": "bg-zinc-50 text-zinc-700 border-zinc-200",
  "📁 Link": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "📅 Date": "bg-amber-50 text-amber-700 border-amber-200",
  "⚠️ Flag": "bg-red-50 text-red-700 border-red-200",
  "📦 Material": "bg-teal-50 text-teal-700 border-teal-200",
  "🧾 Billing": "bg-sky-50 text-sky-700 border-sky-200",
  "📊 WIP": "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  "🔍 Audit": "bg-purple-50 text-purple-700 border-purple-200",
  "🚚 Logistics": "bg-lime-50 text-lime-700 border-lime-200",
};

const phaseFilters = ["All", "Core Controls", "Financial", "Closeout"] as const;
type PhaseFilter = (typeof phaseFilters)[number];

export default function Reports() {
  const [activeFilter, setActiveFilter] = useState<PhaseFilter>("All");
  const [expandedStageIds, setExpandedStageIds] = useState<string[]>(STAGES.map((stage) => stage.id));

  const filteredStages = useMemo(() => {
    if (activeFilter === "All") {
      return STAGES;
    }

    if (activeFilter === "Core Controls") {
      return STAGES.filter((stage) => Number(stage.phase) <= 7);
    }

    if (activeFilter === "Financial") {
      return STAGES.filter((stage) => ["08", "09", "10"].includes(stage.phase));
    }

    return STAGES.filter((stage) => stage.phase === "11");
  }, [activeFilter]);

  const stageCount = filteredStages.length;
  const totalTrackedFields = filteredStages.reduce((sum, stage) => sum + stage.fields.length, 0);

  const toggleStage = (id: string) => {
    setExpandedStageIds((previous) =>
      previous.includes(id) ? previous.filter((stageId) => stageId !== id) : [...previous, id],
    );
  };

  const areAllExpanded = expandedStageIds.length === STAGES.length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Card className="sticky top-0 z-20 border-border/80 bg-background/95 shadow-sm backdrop-blur">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-2xl md:text-3xl">NBS Awarded Estimate → Cash Lifecycle</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-sm md:text-base">
                Executive workflow for Division 10 material-supply-only operations. Buyout precedes submittals,
                required approvals gate PO issuance, and financial controls are material-based from procurement through closeout.
              </CardDescription>
            </div>
            <Badge className="w-fit border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
              Material Supply Only
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Lifecycle Stages</p>
              <p className="text-xl font-semibold">{stageCount}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tracked Field Lineage</p>
              <p className="text-xl font-semibold">{totalTrackedFields}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">PO Gate Rule</p>
              <p className="text-sm font-semibold">Submittal approval required when flagged</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Focus:
            </span>
            {phaseFilters.map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={filter === activeFilter ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </Button>
            ))}
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExpandedStageIds(STAGES.map((stage) => stage.id))}
              >
                Expand all
              </Button>
              <Button size="sm" variant="outline" onClick={() => setExpandedStageIds([])}>
                Collapse all
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="relative space-y-4 pb-6">
        <div className="absolute left-5 top-3 hidden h-[calc(100%-3rem)] w-px bg-border md:block" />

        {filteredStages.map((stage) => {
          const isExpanded = expandedStageIds.includes(stage.id);

          return (
            <Card
              key={stage.id}
              className="relative overflow-hidden border shadow-sm transition-all hover:shadow-md"
              style={{ borderColor: stage.colorBorder, background: `linear-gradient(180deg, ${stage.colorSoft} 0%, rgba(255,255,255,0) 40%)` }}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 hidden h-10 w-10 items-center justify-center rounded-full border bg-background text-lg md:flex"
                      style={{ borderColor: stage.colorBorder, color: stage.color }}
                    >
                      {stage.icon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs" style={{ borderColor: stage.colorBorder, color: stage.color }}>
                          {stage.phase}
                        </Badge>
                        <h2 className="text-lg font-semibold tracking-tight">{stage.label}</h2>
                        <Badge variant="secondary" className="text-xs">
                          {stage.sublabel}
                        </Badge>
                      </div>
                      <p className="mt-2 max-w-4xl text-sm text-muted-foreground">{stage.description}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toggleStage(stage.id)}>
                    {isExpanded ? (
                      <>
                        <ChevronUp className="mr-1 h-4 w-4" /> Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-1 h-4 w-4" /> Expand
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="rounded-lg border bg-background/90 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Trigger</p>
                      <p className="mt-1 text-sm font-medium">{stage.trigger}</p>
                    </div>
                    <div className="rounded-lg border bg-background/90 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Primary Module</p>
                      <p className="mt-1 text-sm font-medium">{stage.module}</p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Key Field Lineage</p>
                    <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                      {stage.fields.map((field) => (
                        <div key={`${stage.id}-${field.name}`} className="rounded-lg border bg-background p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{field.name}</p>
                            <Badge variant="outline" className={typeStyles[field.type]}>
                              {field.type}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{field.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Forward Flow:</span>
                    {stage.forwardTo.length ? (
                      stage.forwardTo.map((target) => (
                        <Badge key={`${stage.id}-${target}`} variant="secondary">
                          {target}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary">Lifecycle Complete</Badge>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
          <p>
            This visual is intentionally scoped to material supply only. Installation, field labor, crew production, and labor-based percent-complete logic are excluded by design.
          </p>
        </CardContent>
      </Card>

      {!areAllExpanded && (
        <div className="pb-2 text-center text-xs text-muted-foreground">
          Some stages are collapsed. Use <span className="font-medium">Expand all</span> for full executive walkthrough mode.
        </div>
      )}
    </div>
  );
}
