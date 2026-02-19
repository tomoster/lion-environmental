import { createClient } from "@/lib/supabase/server";
import { InvoicesTable } from "./invoices-table";

export default async function InvoicesPage() {
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, client_company, building_address, total, status, date_sent, due_date"
    )
    .order("invoice_number", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Invoices are generated from jobs. Open a job and click Generate Invoice.
        </p>
      </div>

      <InvoicesTable invoices={invoices ?? []} />
    </div>
  );
}
