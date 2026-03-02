import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { markAsPaid, updateInvoiceStatus, generateAndStorePdf, sendInvoiceToClient } from "../actions";
import { formatServiceTypes } from "@/lib/service-type-utils";

type PageProps = {
  params: Promise<{ id: string }>;
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case "draft":
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
    case "sent":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "paid":
      return "bg-green-100 text-green-700 border-green-200";
    case "overdue":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
};

function formatCurrency(amount: number | null): string {
  if (amount === null) return "\u2014";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "\u2014";
  const d = new Date(
    dateString.length === 10 ? dateString + "T00:00:00" : dateString
  );
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

type PropertyRow = {
  building_address: string | null;
  has_xrf: boolean;
  has_dust_swab: boolean;
  has_asbestos: boolean;
  num_units: number | null;
  num_studios_1bed: number | null;
  xrf_price_studios_1bed: number | null;
  num_2_3bed: number | null;
  xrf_price_2_3bed: number | null;
  num_common_spaces: number | null;
  xrf_price_per_common_space: number | null;
  num_wipes: number | null;
  wipe_rate: number | null;
  dust_swab_site_visit_rate: number | null;
  dust_swab_proj_mgmt_rate: number | null;
  num_asbestos_samples: number | null;
  asbestos_sample_rate: number | null;
  asbestos_site_visit_rate: number | null;
};

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "*, jobs(id, job_number, client_email)"
    )
    .eq("id", id)
    .single();

  if (!invoice) notFound();

  const job = invoice.jobs as {
    id: string;
    job_number: number;
    client_email: string | null;
  } | null;

  const { data: properties } = await supabase
    .from("properties")
    .select(
      "building_address, has_xrf, has_dust_swab, has_asbestos, num_units, num_studios_1bed, xrf_price_studios_1bed, num_2_3bed, xrf_price_2_3bed, num_common_spaces, xrf_price_per_common_space, num_wipes, wipe_rate, dust_swab_site_visit_rate, dust_swab_proj_mgmt_rate, num_asbestos_samples, asbestos_sample_rate, asbestos_site_visit_rate"
    )
    .eq("job_id", invoice.job_id!);

  const props = (properties ?? []) as PropertyRow[];
  const showPropertyHeaders = props.length > 1;

  const markAsPaidWithId = markAsPaid.bind(null, id);
  const generatePdfWithId = generateAndStorePdf.bind(null, id);
  const markAsSentWithId = updateInvoiceStatus.bind(null, id, "sent");
  const sendToClientWithId = sendInvoiceToClient.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Invoices
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">
            Invoice #{invoice.invoice_number}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {invoice.status !== "paid" && (
            <form action={markAsPaidWithId}>
              <Button type="submit" variant="outline">
                Mark as Paid
              </Button>
            </form>
          )}
          {invoice.status === "draft" && (
            <form action={markAsSentWithId}>
              <Button type="submit" variant="outline">
                Mark as Sent
              </Button>
            </form>
          )}
          {job?.client_email && invoice.status !== "paid" && (
            <form action={sendToClientWithId}>
              <Button type="submit" variant="default">
                Send to Client
              </Button>
            </form>
          )}
          <form action={generatePdfWithId}>
            <Button type="submit" variant="outline">Generate PDF</Button>
          </form>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">
          Invoice #{invoice.invoice_number}
        </h1>
        <Badge
          variant="outline"
          className={statusBadgeClass(invoice.status)}
        >
          {STATUS_LABELS[invoice.status] ?? invoice.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-start pb-4 border-b">
                <div>
                  <p className="font-semibold text-base">
                    Lion Environmental LLC
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    1500 Teaneck Rd #448
                    <br />
                    Teaneck, NJ 07666
                    <br />
                    (201) 375-2797
                    <br />
                    lionenvironmentalllc@gmail.com
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tracking-wide text-muted-foreground">
                    INVOICE
                  </p>
                  <div className="text-sm mt-1 space-y-0.5">
                    <p>
                      <span className="text-muted-foreground">Invoice #</span>{" "}
                      <span className="font-medium">
                        {invoice.invoice_number}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Date:</span>{" "}
                      {formatDate(invoice.date_sent ?? invoice.created_at)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Due:</span>{" "}
                      {formatDate(invoice.due_date)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Bill To
                </p>
                <p className="font-medium">
                  {invoice.client_company ?? "\u2014"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {invoice.building_address ?? "\u2014"}
                </p>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {props.map((prop, i) => (
                      <PropertyLineItems key={i} prop={prop} showHeader={showPropertyHeaders} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Tax ({invoice.tax_rate ?? 8.88}%)
                    </span>
                    <span>{formatCurrency(invoice.tax_amount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base pt-1">
                    <span>Total Due</span>
                    <span>{formatCurrency(invoice.total)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/40 rounded-md p-4 text-sm space-y-1">
                <p className="font-medium">Payment Instructions</p>
                <p className="text-muted-foreground">
                  Zelle: 2013752797
                </p>
                <p className="text-muted-foreground">
                  Check payable to: Lion Environmental LLC
                </p>
                <p className="text-muted-foreground">
                  Mail to: 1500 Teaneck Rd #448, Teaneck, NJ 07666
                </p>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Thank you for your business!
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant="outline"
                  className={statusBadgeClass(invoice.status)}
                >
                  {STATUS_LABELS[invoice.status] ?? invoice.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice #</span>
                <span className="font-mono font-medium">
                  #{invoice.invoice_number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>
                  {invoice.created_at
                    ? new Date(invoice.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "\u2014"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sent</span>
                <span>{formatDate(invoice.date_sent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due</span>
                <span>{formatDate(invoice.due_date)}</span>
              </div>
              {invoice.date_paid && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span>{formatDate(invoice.date_paid)}</span>
                </div>
              )}

              {invoice.pdf_path && (
                <>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">PDF</span>
                    <span className="text-xs text-green-600 font-medium">
                      Generated
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {job && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked Job</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Job #</span>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="font-mono font-medium text-primary hover:underline"
                  >
                    #{job.job_number}
                  </Link>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Properties</span>
                  <span>{props.length}</span>
                </div>
                {job.client_email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="truncate max-w-[140px]">
                      {job.client_email}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PropertyLineItems({ prop, showHeader }: { prop: PropertyRow; showHeader: boolean }) {
  return (
    <>
      {showHeader && prop.building_address && (
        <tr className="bg-blue-50/50">
          <td colSpan={2} className="px-4 py-2 font-medium text-xs text-blue-800 uppercase tracking-wide">
            {prop.building_address}
          </td>
        </tr>
      )}

      {prop.has_xrf && (
        <>
          {(prop.num_studios_1bed ?? 0) > 0 && (
            <tr>
              <td className="px-4 py-3">
                Studios & 1-Bed ({prop.num_studios_1bed} x {formatCurrency(prop.xrf_price_studios_1bed ?? 0)})
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency((prop.num_studios_1bed ?? 0) * (prop.xrf_price_studios_1bed ?? 0))}
              </td>
            </tr>
          )}
          {(prop.num_2_3bed ?? 0) > 0 && (
            <tr>
              <td className="px-4 py-3">
                2 & 3-Bed ({prop.num_2_3bed} x {formatCurrency(prop.xrf_price_2_3bed ?? 0)})
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency((prop.num_2_3bed ?? 0) * (prop.xrf_price_2_3bed ?? 0))}
              </td>
            </tr>
          )}
          {(prop.num_common_spaces ?? 0) > 0 && (prop.xrf_price_per_common_space ?? 0) > 0 && (
            <tr>
              <td className="px-4 py-3">
                Common Spaces ({prop.num_common_spaces} x {formatCurrency(prop.xrf_price_per_common_space ?? 0)})
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency((prop.num_common_spaces ?? 0) * (prop.xrf_price_per_common_space ?? 0))}
              </td>
            </tr>
          )}
        </>
      )}

      {prop.has_dust_swab && (
        <>
          <tr>
            <td className="px-4 py-3">Site Visit</td>
            <td className="px-4 py-3 text-right">{formatCurrency(prop.dust_swab_site_visit_rate ?? 0)}</td>
          </tr>
          <tr>
            <td className="px-4 py-3">Project Management & Report</td>
            <td className="px-4 py-3 text-right">{formatCurrency(prop.dust_swab_proj_mgmt_rate ?? 0)}</td>
          </tr>
          <tr>
            <td className="px-4 py-3">
              Wipe Samples ({prop.num_wipes ?? 0} x {formatCurrency(prop.wipe_rate ?? 0)})
            </td>
            <td className="px-4 py-3 text-right">
              {formatCurrency((prop.num_wipes ?? 0) * (prop.wipe_rate ?? 0))}
            </td>
          </tr>
        </>
      )}

      {prop.has_asbestos && (
        <>
          <tr>
            <td className="px-4 py-3">Site Visit</td>
            <td className="px-4 py-3 text-right">{formatCurrency(prop.asbestos_site_visit_rate ?? 0)}</td>
          </tr>
          <tr>
            <td className="px-4 py-3">
              Asbestos Samples ({prop.num_asbestos_samples ?? 0} x {formatCurrency(prop.asbestos_sample_rate ?? 0)})
            </td>
            <td className="px-4 py-3 text-right">
              {formatCurrency((prop.num_asbestos_samples ?? 0) * (prop.asbestos_sample_rate ?? 0))}
            </td>
          </tr>
        </>
      )}
    </>
  );
}
