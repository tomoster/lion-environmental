import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseForm } from "./expense-form";
import { ExpensesTable } from "./expenses-table";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

export default async function FinancesPage() {
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartIso = monthStart.toISOString().slice(0, 10);

  const [
    { data: paidInvoices },
    { data: outstandingInvoices },
    { data: workerPaymentsThisMonth },
    { data: expensesThisMonth },
    { data: allExpenses },
    { data: jobs },
    { data: workersWithJobs },
    { data: revenueByMonth },
    { data: expensesByMonth },
    { data: paymentsByMonth },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("total")
      .eq("status", "paid")
      .gte("date_paid", monthStartIso),
    supabase
      .from("invoices")
      .select("total")
      .in("status", ["sent", "overdue"]),
    supabase
      .from("worker_payments")
      .select("amount")
      .gte("payment_date", monthStartIso),
    supabase
      .from("expenses")
      .select("amount")
      .gte("date", monthStartIso),
    supabase
      .from("expenses")
      .select("id, date, description, category, amount, job_id, jobs(job_number)")
      .order("date", { ascending: false }),
    supabase
      .from("jobs")
      .select("id, job_number")
      .order("job_number", { ascending: false }),
    supabase
      .from("workers")
      .select(`
        id, name, rate_per_unit, rate_per_common_space,
        jobs(id, num_units, num_common_spaces, job_status),
        worker_payments(amount)
      `)
      .eq("active", true),
    supabase
      .from("invoices")
      .select("total, date_paid")
      .eq("status", "paid")
      .not("date_paid", "is", null)
      .order("date_paid", { ascending: false }),
    supabase
      .from("expenses")
      .select("amount, date")
      .order("date", { ascending: false }),
    supabase
      .from("worker_payments")
      .select("amount, payment_date")
      .order("payment_date", { ascending: false }),
  ]);

  const revenueThisMonth = (paidInvoices ?? []).reduce(
    (sum, inv) => sum + (inv.total ?? 0),
    0
  );
  const workerPayTotal = (workerPaymentsThisMonth ?? []).reduce(
    (sum, p) => sum + p.amount,
    0
  );
  const expenseTotal = (expensesThisMonth ?? []).reduce(
    (sum, e) => sum + e.amount,
    0
  );
  const totalExpensesThisMonth = workerPayTotal + expenseTotal;
  const profitThisMonth = revenueThisMonth - totalExpensesThisMonth;
  const outstanding = (outstandingInvoices ?? []).reduce(
    (sum, inv) => sum + (inv.total ?? 0),
    0
  );

  // Worker payables
  type WorkerPayable = {
    name: string;
    expected: number;
    paid: number;
    owed: number;
  };
  const workerPayables: WorkerPayable[] = [];

  for (const w of workersWithJobs ?? []) {
    const workerJobs = Array.isArray(w.jobs) ? w.jobs : [];
    const workerPayments = Array.isArray(w.worker_payments)
      ? w.worker_payments
      : [];

    const expected = workerJobs
      .filter(
        (j: { job_status: string }) =>
          j.job_status === "assigned" || j.job_status === "completed"
      )
      .reduce((sum: number, j: { num_units: number | null; num_common_spaces: number | null }) => {
        const unitPay = (j.num_units ?? 0) * (w.rate_per_unit ?? 0);
        const csPay = (j.num_common_spaces ?? 0) * (w.rate_per_common_space ?? 0);
        return sum + unitPay + csPay;
      }, 0);

    const paid = workerPayments.reduce(
      (sum: number, p: { amount: number }) => sum + p.amount,
      0
    );

    const owed = expected - paid;
    if (owed > 0) {
      workerPayables.push({ name: w.name, expected, paid, owed });
    }
  }

  // Expenses table rows
  const expenseRows = (allExpenses ?? []).map((e) => ({
    id: e.id,
    date: e.date,
    description: e.description,
    category: e.category,
    amount: e.amount,
    job_number:
      e.jobs && !Array.isArray(e.jobs) ? e.jobs.job_number : null,
  }));

  const jobOptions = (jobs ?? []).map((j) => ({
    id: j.id,
    job_number: j.job_number,
  }));

  // Revenue by month (last 6 months)
  const monthlyData = buildMonthlyData(
    revenueByMonth ?? [],
    expensesByMonth ?? [],
    paymentsByMonth ?? []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Finances</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue, expenses, and profitability
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(revenueThisMonth)}</p>
            <p className="mt-1 text-xs text-muted-foreground">paid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expenses (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(totalExpensesThisMonth)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              worker pay + expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Profit (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-semibold ${profitThisMonth < 0 ? "text-red-600" : ""}`}>
              {formatCurrency(profitThisMonth)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">revenue - expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(outstanding)}</p>
            <p className="mt-1 text-xs text-muted-foreground">sent + overdue</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Worker payables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Worker Payables</CardTitle>
          </CardHeader>
          <CardContent>
            {workerPayables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All workers are paid up.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Owed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workerPayables.map((w) => (
                    <TableRow key={w.name}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatCurrency(w.expected)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatCurrency(w.paid)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium text-red-600">
                        {formatCurrency(w.owed)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Revenue by month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No data yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  monthlyData.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{m.month}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatCurrency(m.revenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatCurrency(m.expenses)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums text-sm font-medium ${
                          m.profit < 0 ? "text-red-600" : ""
                        }`}
                      >
                        {formatCurrency(m.profit)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Expenses</CardTitle>
          <ExpenseForm
            jobs={jobOptions}
            trigger={<Button>Add Expense</Button>}
          />
        </CardHeader>
        <CardContent>
          <ExpensesTable expenses={expenseRows} />
        </CardContent>
      </Card>
    </div>
  );
}

function buildMonthlyData(
  revenue: { total: number | null; date_paid: string | null }[],
  expenses: { amount: number; date: string }[],
  payments: { amount: number; payment_date: string }[]
) {
  const months: Record<string, { revenue: number; expenses: number }> = {};

  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months[key] = { revenue: 0, expenses: 0 };
  }

  for (const inv of revenue) {
    if (!inv.date_paid) continue;
    const key = inv.date_paid.slice(0, 7);
    if (months[key]) months[key].revenue += inv.total ?? 0;
  }

  for (const e of expenses) {
    const key = e.date.slice(0, 7);
    if (months[key]) months[key].expenses += e.amount;
  }

  for (const p of payments) {
    const key = p.payment_date.slice(0, 7);
    if (months[key]) months[key].expenses += p.amount;
  }

  return Object.entries(months).map(([key, data]) => {
    const [year, month] = key.split("-");
    const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
      "en-US",
      { month: "short", year: "numeric" }
    );
    return {
      month: label,
      revenue: data.revenue,
      expenses: data.expenses,
      profit: data.revenue - data.expenses,
    };
  });
}
