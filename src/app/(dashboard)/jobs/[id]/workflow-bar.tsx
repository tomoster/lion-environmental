"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type WorkflowBarProps = {
  jobId: string;
  jobStatus: string;
  hasInvoice: boolean;
  invoiceStatus: string | null;
  workerName: string | null;
  clientEmail: string | null;
  hasXrf: boolean;
  hasDustSwab: boolean;
  hasAsbestos: boolean;
  xrfReportStatus: string;
  dustSwabReportStatus: string;
  dispatchAction: () => Promise<void>;
  markPaidAction: () => Promise<void>;
  sendProposalAction: () => Promise<{ error?: string }>;
};

type Stage = {
  label: string;
  state: "completed" | "current" | "pending";
};

function getStages(props: WorkflowBarProps): Stage[] {
  const { jobStatus, hasInvoice, invoiceStatus } = props;

  const statusOrder = ["not_dispatched", "proposal_sent", "open", "assigned", "completed"];
  const statusIndex = statusOrder.indexOf(jobStatus);

  const proposalDone = statusIndex > 0;
  const dispatchDone = statusIndex > 1;
  const completeDone = statusIndex >= 4;
  const invoiceDone = hasInvoice;
  const paidDone = invoiceStatus === "paid";

  return [
    { label: "Proposal", state: proposalDone ? "completed" : statusIndex === 0 ? "current" : "pending" },
    { label: "Dispatch", state: dispatchDone ? "completed" : proposalDone && !dispatchDone ? "current" : "pending" },
    { label: "Complete", state: completeDone ? "completed" : dispatchDone && !completeDone ? "current" : "pending" },
    { label: "Invoice", state: invoiceDone && completeDone ? (paidDone ? "completed" : "completed") : completeDone ? "current" : "pending" },
    { label: "Paid", state: paidDone ? "completed" : invoiceDone && completeDone ? "current" : "pending" },
  ];
}

function getDescription(props: WorkflowBarProps): string {
  const { jobStatus, hasInvoice, invoiceStatus, workerName, hasXrf, hasDustSwab, hasAsbestos, xrfReportStatus, dustSwabReportStatus } = props;

  if (jobStatus === "not_dispatched") return "Fill in job details, then send proposal to client";
  if (jobStatus === "proposal_sent") return "Proposal sent — dispatch job to available workers";
  if (jobStatus === "open") return "Dispatched — waiting for worker to accept";
  if (jobStatus === "assigned") return `Assigned to ${workerName ?? "worker"} — job in progress`;

  if (jobStatus === "completed") {
    if (!hasInvoice) return "Job complete — generate and send invoice";
    if (invoiceStatus !== "paid") return "Invoice sent — mark as paid when client pays";

    const xrfDone = !hasXrf || xrfReportStatus === "sent";
    const dustSwabDone = !hasDustSwab || dustSwabReportStatus === "sent";
    const allDone = xrfDone && dustSwabDone && !hasAsbestos;

    if (allDone) return "All done — reports sent to client";
    return "Paid — upload reports below, they'll auto-send to client";
  }

  return "";
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function WorkflowBar(props: WorkflowBarProps) {
  const { jobId, jobStatus, hasInvoice, invoiceStatus, clientEmail, hasXrf, hasDustSwab, hasAsbestos } = props;
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const stages = getStages(props);
  const description = getDescription(props);

  const hasServices = hasXrf || hasDustSwab || hasAsbestos;
  const canSendProposal = jobStatus === "not_dispatched" && !!clientEmail && hasServices;
  const canDispatch = jobStatus === "proposal_sent";
  const canGenerateInvoice = jobStatus === "completed" && !hasInvoice;
  const canMarkPaid = hasInvoice && invoiceStatus !== "paid" && jobStatus === "completed";

  function handleSendProposal() {
    startTransition(async () => {
      try {
        const result = await props.sendProposalAction();
        if (result.error) {
          toast.error(`Proposal failed: ${result.error}`);
        } else {
          toast.success("Proposal sent to client");
        }
      } catch {
        toast.error("Failed to send proposal");
      }
    });
  }

  function handleDispatch() {
    startTransition(async () => {
      try {
        await props.dispatchAction();
        toast.success("Job dispatched to workers");
      } catch {
        toast.error("Failed to dispatch job");
      }
    });
  }

  function handleMarkPaid() {
    startTransition(async () => {
      try {
        await props.markPaidAction();
        toast.success("Marked as paid");
      } catch {
        toast.error("Failed to mark as paid");
      }
    });
  }

  function handleGenerateInvoice() {
    router.push(`/invoices/new?job_id=${jobId}`);
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`shrink-0 flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium ${
                  stage.state === "completed"
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : stage.state === "current"
                    ? "bg-blue-100 text-blue-700 border-2 border-blue-400"
                    : "bg-zinc-100 text-zinc-400 border border-zinc-200"
                }`}
              >
                {stage.state === "completed" ? <CheckIcon /> : i + 1}
              </div>
              <span
                className={`text-sm whitespace-nowrap ${
                  stage.state === "completed"
                    ? "text-green-700 font-medium"
                    : stage.state === "current"
                    ? "text-blue-700 font-semibold"
                    : "text-zinc-400"
                }`}
              >
                {stage.label}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div
                className={`flex-1 h-px ${
                  stage.state === "completed" ? "bg-green-300" : "bg-zinc-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="shrink-0">
          {canSendProposal && (
            <Button size="sm" onClick={handleSendProposal} disabled={isPending}>
              {isPending ? "Sending..." : "Send Proposal"}
            </Button>
          )}
          {jobStatus === "not_dispatched" && !canSendProposal && (
            <Button size="sm" disabled title="Add client email and at least one service type">
              Send Proposal
            </Button>
          )}
          {canDispatch && (
            <Button size="sm" onClick={handleDispatch} disabled={isPending}>
              {isPending ? "Dispatching..." : "Dispatch to Workers"}
            </Button>
          )}
          {canGenerateInvoice && (
            <Button size="sm" onClick={handleGenerateInvoice}>
              Generate Invoice
            </Button>
          )}
          {canMarkPaid && (
            <Button size="sm" onClick={handleMarkPaid} disabled={isPending}>
              {isPending ? "Processing..." : "Client Paid"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
