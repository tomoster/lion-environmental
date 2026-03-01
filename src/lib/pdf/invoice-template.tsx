import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    color: "#111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  businessName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  businessInfo: {
    color: "#555",
    lineHeight: 1.5,
  },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    textAlign: "right",
    marginBottom: 8,
  },
  invoiceMeta: {
    textAlign: "right",
    lineHeight: 1.6,
    color: "#555",
  },
  invoiceMetaLabel: {
    fontFamily: "Helvetica-Bold",
    color: "#111",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 16,
  },
  billToSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  billToName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginBottom: 2,
  },
  billToAddress: {
    color: "#555",
    lineHeight: 1.5,
  },
  lineItemsTable: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    padding: "8 10",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#555",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    padding: "9 10",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  colDescription: {
    flex: 1,
  },
  colAmount: {
    width: 90,
    textAlign: "right",
  },
  totalsSection: {
    marginLeft: "auto",
    width: 240,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "5 10",
  },
  totalLabel: {
    color: "#555",
  },
  totalDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginVertical: 4,
  },
  totalFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "8 10",
    backgroundColor: "#f8fafc",
  },
  totalFinalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  totalFinalAmount: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  paymentSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    marginBottom: 12,
  },
  paymentTitle: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  paymentLine: {
    color: "#444",
    lineHeight: 1.6,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    textAlign: "center",
    color: "#888",
    fontSize: 9,
  },
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  const d = new Date(dateString + (dateString.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export type InvoiceData = {
  invoice_number: number;
  client_company: string | null;
  building_address: string | null;
  subtotal: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  total: number | null;
  date_sent: string | null;
  due_date: string | null;
  created_at: string | null;
};

export type JobData = {
  has_xrf: boolean;
  has_dust_swab: boolean;
  has_asbestos: boolean;
  num_units: number | null;
  num_studios_1bed: number | null;
  xrf_price_studios_1bed: number | null;
  num_2_3bed: number | null;
  xrf_price_2_3bed: number | null;
  num_common_spaces: number | null;
  num_wipes: number | null;
  wipe_rate: number | null;
  dust_swab_site_visit_rate: number | null;
  dust_swab_proj_mgmt_rate: number | null;
  num_asbestos_samples: number | null;
  asbestos_sample_rate: number | null;
  asbestos_site_visit_rate: number | null;
};

export function InvoiceDocument({
  invoice,
  job,
}: {
  invoice: InvoiceData;
  job: JobData;
}) {
  const invoiceDateStr = invoice.date_sent ?? invoice.created_at;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>Lion Environmental LLC</Text>
            <Text style={styles.businessInfo}>
              1500 Teaneck Rd #448{"\n"}
              Teaneck, NJ 07666{"\n"}
              (201) 375-2797{"\n"}
              lionenvironmentalllc@gmail.com
            </Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceMeta}>
              <Text style={styles.invoiceMetaLabel}>Invoice # </Text>
              {invoice.invoice_number}{"\n"}
              <Text style={styles.invoiceMetaLabel}>Date: </Text>
              {formatDate(invoiceDateStr)}{"\n"}
              <Text style={styles.invoiceMetaLabel}>Due Date: </Text>
              {formatDate(invoice.due_date)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.billToSection}>
          <Text style={styles.sectionLabel}>Bill To</Text>
          <Text style={styles.billToName}>
            {invoice.client_company ?? "—"}
          </Text>
          <Text style={styles.billToAddress}>
            {invoice.building_address ?? "—"}
          </Text>
        </View>

        <View style={styles.lineItemsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>
              Amount
            </Text>
          </View>

          {job.has_xrf && (
            <>
              {(job.num_studios_1bed ?? 0) > 0 && (
                <View style={styles.tableRow}>
                  <Text style={styles.colDescription}>
                    Studios & 1-Bed Inspections ({job.num_studios_1bed} units{" "}
                    {formatCurrency(job.xrf_price_studios_1bed ?? 0)}/unit)
                  </Text>
                  <Text style={styles.colAmount}>
                    {formatCurrency(
                      (job.num_studios_1bed ?? 0) * (job.xrf_price_studios_1bed ?? 0)
                    )}
                  </Text>
                </View>
              )}
              {(job.num_2_3bed ?? 0) > 0 && (
                <View style={styles.tableRow}>
                  <Text style={styles.colDescription}>
                    2 & 3-Bed Inspections ({job.num_2_3bed} units{" "}
                    {formatCurrency(job.xrf_price_2_3bed ?? 0)}/unit)
                  </Text>
                  <Text style={styles.colAmount}>
                    {formatCurrency(
                      (job.num_2_3bed ?? 0) * (job.xrf_price_2_3bed ?? 0)
                    )}
                  </Text>
                </View>
              )}
            </>
          )}

          {job.has_dust_swab && (
            <>
              <View style={styles.tableRow}>
                <Text style={styles.colDescription}>Site Visit</Text>
                <Text style={styles.colAmount}>{formatCurrency(job.dust_swab_site_visit_rate ?? 0)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.colDescription}>Project Management & Report</Text>
                <Text style={styles.colAmount}>{formatCurrency(job.dust_swab_proj_mgmt_rate ?? 0)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.colDescription}>
                  Wipe Samples ({job.num_wipes ?? 0} {formatCurrency(job.wipe_rate ?? 0)}/wipe)
                </Text>
                <Text style={styles.colAmount}>
                  {formatCurrency((job.num_wipes ?? 0) * (job.wipe_rate ?? 0))}
                </Text>
              </View>
            </>
          )}

          {job.has_asbestos && (
            <>
              <View style={styles.tableRow}>
                <Text style={styles.colDescription}>Site Visit</Text>
                <Text style={styles.colAmount}>{formatCurrency(job.asbestos_site_visit_rate ?? 0)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.colDescription}>
                  Asbestos Samples ({job.num_asbestos_samples ?? 0} {formatCurrency(job.asbestos_sample_rate ?? 0)}/sample)
                </Text>
                <Text style={styles.colAmount}>
                  {formatCurrency((job.num_asbestos_samples ?? 0) * (job.asbestos_sample_rate ?? 0))}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text>{formatCurrency(invoice.subtotal ?? 0)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Tax ({invoice.tax_rate ?? 8.88}%)
            </Text>
            <Text>{formatCurrency(invoice.tax_amount ?? 0)}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalFinalRow}>
            <Text style={styles.totalFinalLabel}>Total Due</Text>
            <Text style={styles.totalFinalAmount}>
              {formatCurrency(invoice.total ?? 0)}
            </Text>
          </View>
        </View>

        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Instructions</Text>
          <Text style={styles.paymentLine}>
            Zelle: 2013752797{"\n"}
            Check payable to: Lion Environmental LLC{"\n"}
            Mail to: 1500 Teaneck Rd #448, Teaneck, NJ 07666
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoiceToBuffer(
  invoice: InvoiceData,
  job: JobData
): Promise<Buffer> {
  const element = <InvoiceDocument invoice={invoice} job={job} />;
  return renderToBuffer(element) as Promise<Buffer>;
}
