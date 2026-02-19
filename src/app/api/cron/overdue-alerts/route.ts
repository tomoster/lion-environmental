import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "@/lib/telegram/client";
import { getManagementChatIds } from "@/lib/telegram/get-management-chat-ids";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const mgmtChatIds = await getManagementChatIds(supabase);

  if (mgmtChatIds.length === 0) {
    return NextResponse.json({ ok: true, message: "No management chat IDs configured" });
  }

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });

  // Overdue prospect follow-ups (daily)
  const { data: overdueProspects } = await supabase
    .from("prospects")
    .select("id, company, contact_name, next_followup, status")
    .lt("next_followup", today)
    .not("status", "in", '("confirmed","lost")');

  if (overdueProspects && overdueProspects.length > 0) {
    let text = `<b>Overdue Follow-ups (${overdueProspects.length})</b>\n\n`;
    for (const p of overdueProspects) {
      text += `${p.company} \u2014 ${p.contact_name ?? "No contact"} (due ${p.next_followup})\n`;
    }
    await Promise.allSettled(
      mgmtChatIds.map((id) => sendMessage(id, text))
    );
  }

  // Overdue invoices (Mondays only)
  const now = new Date();
  const etDay = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "America/New_York",
  }).format(now);

  if (etDay === "Monday") {
    const { data: overdueInvoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, client_company, total, due_date")
      .eq("status", "sent")
      .lt("due_date", today);

    if (overdueInvoices && overdueInvoices.length > 0) {
      let text = `<b>Overdue Invoices (${overdueInvoices.length})</b>\n\n`;
      for (const inv of overdueInvoices) {
        const total = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(inv.total ?? 0);
        text += `Invoice #${inv.invoice_number} \u2014 ${inv.client_company ?? "\u2014"} \u2014 ${total} (due ${inv.due_date})\n`;
      }
      await Promise.allSettled(
        mgmtChatIds.map((id) => sendMessage(id, text))
      );
    }

    // Unsent invoices
    const { data: unsentInvoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, client_company, total")
      .eq("status", "draft");

    if (unsentInvoices && unsentInvoices.length > 0) {
      let text = `<b>Unsent Invoices (${unsentInvoices.length})</b>\n\n`;
      for (const inv of unsentInvoices) {
        const total = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(inv.total ?? 0);
        text += `Invoice #${inv.invoice_number} \u2014 ${inv.client_company ?? "\u2014"} \u2014 ${total}\n`;
      }
      await Promise.allSettled(
        mgmtChatIds.map((id) => sendMessage(id, text))
      );
    }
  }

  return NextResponse.json({ ok: true });
}
