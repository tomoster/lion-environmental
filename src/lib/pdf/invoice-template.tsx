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
  propertyHeader: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    backgroundColor: "#eef2ff",
    padding: "6 10",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    color: "#333",
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
  if (!dateString) return "\u2014";
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

export type PropertyData = {
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

export type JobData = Omit<PropertyData, "building_address"> & { building_address?: string | null };

export type InvoiceBusinessInfo = {
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessZelle?: string;
  businessCheckAddress?: string;
};

const BIZ_DEFAULTS = {
  businessName: "Lion Environmental LLC",
  businessAddress: "1500 Teaneck Rd #448\nTeaneck, NJ 07666",
  businessPhone: "(201) 375-2797",
  businessEmail: "lionenvironmentalllc@gmail.com",
  businessZelle: "2013752797",
  businessCheckAddress: "1500 Teaneck Rd #448, Teaneck, NJ 07666",
};

function PropertyLineItems({ prop, showHeader }: { prop: PropertyData; showHeader: boolean }) {
  return (
    <>
      {showHeader && prop.building_address && (
        <View style={styles.propertyHeader}>
          <Text>{prop.building_address}</Text>
        </View>
      )}

      {prop.has_xrf && (
        <>
          {(prop.num_studios_1bed ?? 0) > 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.colDescription}>
                Studios & 1-Bed Inspections ({prop.num_studios_1bed} units{" "}
                {formatCurrency(prop.xrf_price_studios_1bed ?? 0)}/unit)
              </Text>
              <Text style={styles.colAmount}>
                {formatCurrency(
                  (prop.num_studios_1bed ?? 0) * (prop.xrf_price_studios_1bed ?? 0)
                )}
              </Text>
            </View>
          )}
          {(prop.num_2_3bed ?? 0) > 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.colDescription}>
                2 & 3-Bed Inspections ({prop.num_2_3bed} units{" "}
                {formatCurrency(prop.xrf_price_2_3bed ?? 0)}/unit)
              </Text>
              <Text style={styles.colAmount}>
                {formatCurrency(
                  (prop.num_2_3bed ?? 0) * (prop.xrf_price_2_3bed ?? 0)
                )}
              </Text>
            </View>
          )}
          {(prop.num_common_spaces ?? 0) > 0 && (prop.xrf_price_per_common_space ?? 0) > 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.colDescription}>
                Common Spaces ({prop.num_common_spaces} spaces{" "}
                {formatCurrency(prop.xrf_price_per_common_space ?? 0)}/space)
              </Text>
              <Text style={styles.colAmount}>
                {formatCurrency(
                  (prop.num_common_spaces ?? 0) * (prop.xrf_price_per_common_space ?? 0)
                )}
              </Text>
            </View>
          )}
        </>
      )}

      {prop.has_dust_swab && (
        <>
          <View style={styles.tableRow}>
            <Text style={styles.colDescription}>Site Visit</Text>
            <Text style={styles.colAmount}>{formatCurrency(prop.dust_swab_site_visit_rate ?? 0)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colDescription}>Project Management & Report</Text>
            <Text style={styles.colAmount}>{formatCurrency(prop.dust_swab_proj_mgmt_rate ?? 0)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colDescription}>
              Wipe Samples ({prop.num_wipes ?? 0} {formatCurrency(prop.wipe_rate ?? 0)}/wipe)
            </Text>
            <Text style={styles.colAmount}>
              {formatCurrency((prop.num_wipes ?? 0) * (prop.wipe_rate ?? 0))}
            </Text>
          </View>
        </>
      )}

      {prop.has_asbestos && (
        <>
          <View style={styles.tableRow}>
            <Text style={styles.colDescription}>Site Visit</Text>
            <Text style={styles.colAmount}>{formatCurrency(prop.asbestos_site_visit_rate ?? 0)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colDescription}>
              Asbestos Samples ({prop.num_asbestos_samples ?? 0} {formatCurrency(prop.asbestos_sample_rate ?? 0)}/sample)
            </Text>
            <Text style={styles.colAmount}>
              {formatCurrency((prop.num_asbestos_samples ?? 0) * (prop.asbestos_sample_rate ?? 0))}
            </Text>
          </View>
        </>
      )}
    </>
  );
}

export function InvoiceDocument({
  invoice,
  properties,
  business,
}: {
  invoice: InvoiceData;
  properties: PropertyData[];
  business?: InvoiceBusinessInfo;
}) {
  const biz = {
    name: business?.businessName || BIZ_DEFAULTS.businessName,
    address: business?.businessAddress || BIZ_DEFAULTS.businessAddress,
    phone: business?.businessPhone || BIZ_DEFAULTS.businessPhone,
    email: business?.businessEmail || BIZ_DEFAULTS.businessEmail,
    zelle: business?.businessZelle || BIZ_DEFAULTS.businessZelle,
    checkAddress: business?.businessCheckAddress || BIZ_DEFAULTS.businessCheckAddress,
  };
  const invoiceDateStr = invoice.date_sent ?? invoice.created_at;
  const showPropertyHeaders = properties.length > 1;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>{biz.name}</Text>
            <Text style={styles.businessInfo}>
              {biz.address}{"\n"}
              {biz.phone}{"\n"}
              {biz.email}
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
            {invoice.client_company ?? "\u2014"}
          </Text>
          <Text style={styles.billToAddress}>
            {invoice.building_address ?? "\u2014"}
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

          {properties.map((prop, i) => (
            <PropertyLineItems key={i} prop={prop} showHeader={showPropertyHeaders} />
          ))}
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
            Zelle: {biz.zelle}{"\n"}
            Check payable to: {biz.name}{"\n"}
            Mail to: {biz.checkAddress}
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
  propertiesOrJob: PropertyData[] | PropertyData | JobData,
  business?: InvoiceBusinessInfo
): Promise<Buffer> {
  const raw = Array.isArray(propertiesOrJob) ? propertiesOrJob : [propertiesOrJob];
  const properties: PropertyData[] = raw.map((p) => ({
    building_address: null,
    ...p,
  }));
  const element = <InvoiceDocument invoice={invoice} properties={properties} business={business} />;
  return renderToBuffer(element) as Promise<Buffer>;
}
