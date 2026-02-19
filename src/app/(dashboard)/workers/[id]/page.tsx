import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkerForm } from "../worker-form";
import { PaymentForm } from "../payment-form";
import { PaymentsTable } from "./payments-table";
import { AvailabilitySection } from "./availability-section";

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: worker }, { data: payments }, { data: workerJobs }, { data: availability }] =
    await Promise.all([
      supabase.from("workers").select("*").eq("id", id).single(),
      supabase
        .from("worker_payments")
        .select(
          `
        id,
        amount,
        payment_date,
        confirmation_number,
        notes,
        job_id,
        jobs (
          job_number
        )
      `
        )
        .eq("worker_id", id)
        .order("payment_date", { ascending: false }),
      supabase
        .from("jobs")
        .select("id, job_number, building_address, client_company")
        .eq("worker_id", id)
        .order("job_number", { ascending: false }),
      supabase
        .from("worker_availability")
        .select("id, type, day_of_week, specific_date, reason")
        .eq("worker_id", id)
        .order("created_at"),
    ]);

  if (!worker) {
    notFound();
  }

  const paymentRows = (payments ?? []).map((p) => ({
    id: p.id,
    amount: p.amount,
    payment_date: p.payment_date,
    confirmation_number: p.confirmation_number,
    notes: p.notes,
    job_number:
      p.jobs && !Array.isArray(p.jobs) ? p.jobs.job_number : null,
  }));

  const totalPaid = paymentRows.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/workers"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Workers
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{worker.name}</h1>
          <WorkerForm
            mode="edit"
            worker={worker}
            trigger={<Button variant="outline">Edit Worker</Button>}
          />
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Worker Info</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="mt-1">
                {worker.active ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd className="mt-1 text-sm">{worker.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-1 text-sm">{worker.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Zelle</dt>
              <dd className="mt-1 text-sm">{worker.zelle ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Specialization</dt>
              <dd className="mt-1 text-sm">{worker.specialization ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Rate / Unit</dt>
              <dd className="mt-1 text-sm">
                {worker.rate_per_unit != null ? `$${worker.rate_per_unit.toFixed(2)}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Rate / Common Space</dt>
              <dd className="mt-1 text-sm">
                {worker.rate_per_common_space != null ? `$${worker.rate_per_common_space.toFixed(2)}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Total Paid</dt>
              <dd className="mt-1 text-sm font-medium">
                ${totalPaid.toFixed(2)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="mb-8">
        <AvailabilitySection workerId={worker.id} blocks={availability ?? []} />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Payments</h2>
          <PaymentForm
            workerId={worker.id}
            workerJobs={workerJobs ?? []}
            trigger={<Button>Add Payment</Button>}
          />
        </div>
        <div className="rounded-lg border">
          <PaymentsTable payments={paymentRows} workerId={worker.id} />
        </div>
      </div>
    </div>
  );
}
