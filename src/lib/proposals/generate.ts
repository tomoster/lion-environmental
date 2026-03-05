import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const LOGO_PATH = path.join(process.cwd(), "public", "images", "lion-logo.png");
const CURSIVE_FONT_PATH = path.join(process.cwd(), "public", "fonts", "DancingScript.ttf");

const PAGE_WIDTH = 612;
const LEFT = 72;
const RIGHT = PAGE_WIDTH - 72;
const CONTENT_WIDTH = RIGHT - LEFT; // 468

export type ProposalData = {
  building_address: string | null;
  num_units: number | null;
  has_xrf: boolean;
  has_dust_swab: boolean;
  has_asbestos: boolean;
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
  has_studios_1bed?: boolean;
  has_2_3bed?: boolean;
  has_common_spaces?: boolean;
  has_wipes?: boolean;
  has_asbestos_samples?: boolean;
};

export type ProposalJobInfo = {
  job_number: number;
  client_company: string | null;
};

function addressSlug(address: string | null): string {
  if (!address) return "unknown";
  return address.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type GeneratedProposal = {
  type: "xrf" | "dust_swab" | "asbestos";
  buffer: Buffer;
  filename: string;
};

export type ProposalBusinessInfo = {
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  certificationNumber?: string;
};

const PROPOSAL_DEFAULTS = {
  businessName: "Lion Environmental",
  businessAddress: "1500 Teaneck Rd #448, Teaneck, NJ 07666",
  businessPhone: "(201) 375-2797",
  certificationNumber: "",
};

function fmt(val: number | null | undefined): string {
  if (val == null) return "TBD";
  return `$${val.toFixed(2)}`;
}

function fmtQty(val: number | null | undefined): string {
  if (val == null) return "TBD";
  return String(val);
}

function createDoc(): InstanceType<typeof PDFDocument> {
  return new PDFDocument({
    size: "LETTER",
    margins: { top: 50, bottom: 55, left: LEFT, right: 72 },
  });
}

function addHeader(doc: InstanceType<typeof PDFDocument>, biz: Required<ProposalBusinessInfo>) {
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, PAGE_WIDTH / 2 - 40, 35, { width: 80 });
  }
  doc.fontSize(20).font("Helvetica-Bold").fillColor("#000000");
  doc.text(biz.businessName, LEFT, 120, { width: CONTENT_WIDTH, align: "center" });
  if (biz.certificationNumber) {
    doc.fontSize(9).font("Helvetica");
    doc.text(`EPA Firm #: ${biz.certificationNumber}`, LEFT, 142, { width: CONTENT_WIDTH, align: "center" });
  }
}

function addFooter(doc: InstanceType<typeof PDFDocument>, biz: Required<ProposalBusinessInfo>) {
  const saved = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.fontSize(8).font("Helvetica").fillColor("#000000");
  doc.text(biz.businessAddress, LEFT, 755, {
    width: CONTENT_WIDTH, align: "center", lineBreak: false,
  });
  doc.text(`P: ${biz.businessPhone}`, LEFT, 767, {
    width: CONTENT_WIDTH, align: "center", lineBreak: false,
  });
  doc.page.margins.bottom = saved;
}

function drawInfoBox(doc: InstanceType<typeof PDFDocument>, data: { client: string; date: string; address: string; units: string }) {
  const y = 170;
  const midX = LEFT + CONTENT_WIDTH / 2;
  const rowH = 30;

  doc.lineWidth(0.5).strokeColor("#000000").fillColor("#000000");
  doc.rect(LEFT, y, CONTENT_WIDTH, rowH * 2).stroke();
  doc.moveTo(LEFT, y + rowH).lineTo(RIGHT, y + rowH).stroke();
  doc.moveTo(midX, y).lineTo(midX, y + rowH * 2).stroke();

  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Client:", LEFT + 5, y + 5, { lineBreak: false });
  doc.font("Helvetica").fontSize(8).text(data.client || "", LEFT + 48, y + 5, { width: midX - LEFT - 55 });
  doc.font("Helvetica-Bold").fontSize(9).text("Date:", midX + 5, y + 5, { lineBreak: false });
  doc.font("Helvetica").text(data.date || "", midX + 40, y + 5, { lineBreak: false });

  doc.font("Helvetica-Bold").fontSize(9).text("Project Address:", LEFT + 5, y + rowH + 5, { lineBreak: false });
  doc.font("Helvetica").fontSize(8).text(data.address || "", LEFT + 95, y + rowH + 5, { width: midX - LEFT - 102 });
  doc.font("Helvetica-Bold").fontSize(9).text("Units:", midX + 5, y + rowH + 5, { lineBreak: false });
  doc.font("Helvetica").text(data.units || "", midX + 40, y + rowH + 5, { lineBreak: false });

  return y + rowH * 2 + 15;
}

function drawProposalNumber(doc: InstanceType<typeof PDFDocument>, num: string) {
  doc.font("Helvetica-Bold").fontSize(11);
  doc.text(`Proposal #${num}`, RIGHT - 110, 145, { width: 110, align: "right", lineBreak: false });
}

type TableCell = { text: string; bold?: boolean; size?: number; align?: "left" | "center" | "right" | "justify" };
type TableRow = { cells: TableCell[]; height?: number };

function drawTable(doc: InstanceType<typeof PDFDocument>, y: number, rows: TableRow[], colWidths: number[]) {
  const colX = [LEFT];
  for (let i = 0; i < colWidths.length - 1; i++) {
    colX.push(colX[i] + colWidths[i]);
  }

  doc.lineWidth(0.5).strokeColor("#000000").fillColor("#000000");

  rows.forEach((row) => {
    const rowH = row.height || 28;
    doc.rect(LEFT, y, CONTENT_WIDTH, rowH).stroke();

    for (let c = 1; c < colX.length; c++) {
      doc.moveTo(colX[c], y).lineTo(colX[c], y + rowH).stroke();
    }

    row.cells.forEach((cell, ci) => {
      const font = cell.bold ? "Helvetica-Bold" : "Helvetica";
      const size = cell.size || 9;
      doc.font(font).fontSize(size).fillColor("#000000");
      const align: "left" | "center" | "right" | "justify" = cell.align || (ci >= 1 ? "center" : "left");
      const padX = 6;
      const textLines = (cell.text || "").split("\n").length;
      const textHeight = textLines * (size + 2);
      const padY = Math.max(4, (rowH - textHeight) / 2);
      doc.text(cell.text || "", colX[ci] + padX, y + padY, {
        width: colWidths[ci] - padX * 2,
        align,
      });
    });

    y += rowH;
  });

  return y;
}

function addAccessScheduling(doc: InstanceType<typeof PDFDocument>, y: number) {
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
  doc.text("Access and Scheduling:", LEFT, y, { width: CONTENT_WIDTH });
  y += 18;
  doc.font("Helvetica").fontSize(9.5);
  doc.text(
    "The Landlord or Property Manager is responsible for scheduling and coordinating all site access. If the Contractor arrives at the scheduled location and access is unavailable, or if the site is not ready and no work can be performed, the Contractor reserves the right to charge ",
    LEFT, y, { width: CONTENT_WIDTH, continued: true }
  );
  doc.font("Helvetica-Bold").text("fifty percent (50%) of the scheduled site visit fee ", { continued: true });
  doc.font("Helvetica").text("for that date.");
  return doc.y + 15;
}

function addPaymentTerms(doc: InstanceType<typeof PDFDocument>, y: number, days: number) {
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
  doc.text("Payment Terms:", LEFT, y, { width: CONTENT_WIDTH });
  y += 18;
  doc.font("Helvetica").fontSize(9.5);

  const daysText = days === 60 ? "sixty (60) days" : "fourteen (14) days";
  doc.text("  -   Payment for services rendered is due within ", LEFT, y, { width: CONTENT_WIDTH, continued: true });
  doc.font("Helvetica-Bold").text(daysText, { continued: true });
  doc.font("Helvetica").text(" from the date of work completion. Any invoice remaining unpaid after this period shall be deemed past due.");

  y = doc.y + 8;
  doc.text("  -   Final reports, clearance documentation, and any related deliverables will ", LEFT, y, { width: CONTENT_WIDTH, continued: true });
  doc.font("Helvetica-Bold").text("not be issued or released ", { continued: true });
  doc.font("Helvetica").text("until full payment has been received and processed by the Contractor.");

  return doc.y + 15;
}

function addSignatureBlock(doc: InstanceType<typeof PDFDocument>, y: number) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000");
  doc.text("This correctly sets forth understanding of the client. Client Agrees to all Terms and Conditions.", LEFT, y, { width: CONTENT_WIDTH });
  y = doc.y + 18;

  const colWidth = (CONTENT_WIDTH - 30) / 2;
  const lineEndL = LEFT + colWidth;
  const rightCol = LEFT + colWidth + 30;
  const lineEndR = RIGHT;

  doc.font("Helvetica-Bold").fontSize(9);

  // Contractor column header
  doc.text("Contractor:", LEFT, y, { lineBreak: false });
  doc.text("Client:", rightCol, y, { lineBreak: false });
  y += 18;

  // Signature row
  doc.text("Signature:", LEFT, y, { lineBreak: false });
  doc.moveTo(LEFT + 65, y + 12).lineTo(lineEndL, y + 12).lineWidth(0.5).stroke();
  doc.text("Accepted By:", rightCol, y, { lineBreak: false });
  doc.moveTo(rightCol + 78, y + 12).lineTo(lineEndR, y + 12).stroke();

  // Avi's cursive signature on the contractor line
  if (fs.existsSync(CURSIVE_FONT_PATH)) {
    doc.font(CURSIVE_FONT_PATH).fontSize(16).fillColor("#000000");
    doc.text("Avi Bursztyn", LEFT + 68, y - 3, { lineBreak: false });
  }
  y += 25;

  // Name row
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Name:", LEFT, y, { lineBreak: false });
  doc.moveTo(LEFT + 42, y + 12).lineTo(lineEndL, y + 12).stroke();
  doc.font("Helvetica").fontSize(9);
  doc.text("Avi Bursztyn", LEFT + 46, y, { lineBreak: false });

  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Signature:", rightCol, y, { lineBreak: false });
  doc.moveTo(rightCol + 65, y + 12).lineTo(lineEndR, y + 12).stroke();
  y += 25;

  // Date row
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Date:", LEFT, y, { lineBreak: false });
  doc.moveTo(LEFT + 35, y + 12).lineTo(lineEndL, y + 12).stroke();
  doc.font("Helvetica").fontSize(9);
  doc.text(todayFormatted(), LEFT + 39, y, { lineBreak: false });

  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Date:", rightCol, y, { lineBreak: false });
  doc.moveTo(rightCol + 35, y + 12).lineTo(lineEndR, y + 12).stroke();
}

function docToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export async function generateXRFProposal(data: ProposalData, jobInfo: ProposalJobInfo, taxRate: number, business?: ProposalBusinessInfo): Promise<Buffer> {
  const biz = {
    businessName: business?.businessName || PROPOSAL_DEFAULTS.businessName,
    businessAddress: business?.businessAddress || PROPOSAL_DEFAULTS.businessAddress,
    businessPhone: business?.businessPhone || PROPOSAL_DEFAULTS.businessPhone,
    certificationNumber: business?.certificationNumber || PROPOSAL_DEFAULTS.certificationNumber,
  };
  const bizLLC = biz.businessName.includes("LLC") ? biz.businessName : `${biz.businessName} LLC`;
  const doc = createDoc();
  const bufferPromise = docToBuffer(doc);

  const proposalNum = String(jobInfo.job_number);
  const date = todayFormatted();

  const showStudios = data.has_studios_1bed !== false;
  const showBeds = data.has_2_3bed !== false;
  const showCommon = data.has_common_spaces !== false;
  const studiosTotal = showStudios ? (data.num_studios_1bed ?? 0) * (data.xrf_price_studios_1bed ?? 0) : 0;
  const bedsTotal = showBeds ? (data.num_2_3bed ?? 0) * (data.xrf_price_2_3bed ?? 0) : 0;
  const commonTotal = showCommon ? (data.num_common_spaces ?? 0) * (data.xrf_price_per_common_space ?? 0) : 0;
  const subtotal = studiosTotal + bedsTotal + commonTotal;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const taxLabel = `New York State Tax\n${(taxRate * 100).toFixed(2)}%`;

  // PAGE 1
  addHeader(doc, biz);
  drawProposalNumber(doc, proposalNum);
  let y = drawInfoBox(doc, {
    client: jobInfo.client_company ?? "",
    date,
    address: data.building_address ?? "",
    units: fmtQty(data.num_units),
  });

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
  doc.text("NYC Local Law 31 Lead Based Paint Inspection Proposal", LEFT, y, { width: CONTENT_WIDTH });
  y = doc.y + 10;

  doc.font("Helvetica-Bold").fontSize(9.5).text("Overview: ", LEFT, y, { continued: true });
  doc.font("Helvetica").text(
    "New York City\u2019s Local Law 31 of 2020 introduced new lead inspection requirements for landlords and building owners, enforced by the NYC Department of Housing Preservation & Development (HPD)."
  );
  y = doc.y + 6;

  doc.font("Helvetica").fontSize(9.5);
  doc.text(
    "Over the past few years, New York City has made several important updates to the NYC Childhood Lead Poisoning Prevention Act (Local Law 1 of 2004), strengthening existing lead laws and expanding inspection requirements for landlords and building owners.",
    LEFT, y, { width: CONTENT_WIDTH }
  );
  y = doc.y + 6;

  doc.text(
    'Local Law 31 of 2020 is the most recent update, which went into effect on August 9, 2020 and mandates X-Ray Fluorescence (XRF) lead inspections by Environmental Protection Agency (EPA)-certified inspectors to test for the presence of lead-based paint in old residential "multiple dwelling" buildings.',
    LEFT, y, { width: CONTENT_WIDTH }
  );
  y = doc.y + 6;

  doc.text(
    "Local Law 31 also includes a 5-year testing requirement, meaning that all residential building owners in NYC must have all dwelling units inspected for lead paint by August 9, 2025.",
    LEFT, y, { width: CONTENT_WIDTH }
  );
  y = doc.y + 6;

  doc.text(
    "Apartments with children under the age of 6 residing, must be inspected within one year of the law. If a family with a child under the age of 6 recently moved into an apartment, lead testing must be completed within 1 year of their move-in date.",
    LEFT, y, { width: CONTENT_WIDTH }
  );
  y = doc.y + 12;

  doc.font("Helvetica-Bold").fontSize(10).text("Scope of Work:", LEFT, y);
  y = doc.y + 6;
  doc.font("Helvetica").fontSize(9.5);

  [
    "A Licensed EPA Lead Inspector will conduct a comprehensive XRF inspection on the entire Tenant space as per HPD requirements.",
    "Lead based paint will be determined using an XRF calibrated to .5 mg/cm2 in accordance with Local Law 66.",
    `Upon completion of the inspection, ${bizLLC} will provide signed documentation to the client verifying that the Apartment has been inspected in accordance with Local Law 31.`,
  ].forEach((b) => {
    doc.text("  \u2022   " + b, LEFT, y, { width: CONTENT_WIDTH });
    y = doc.y + 5;
  });

  y += 3;
  doc.font("Helvetica-Bold").fontSize(9.5);
  doc.text(
    `${biz.businessName} and property owner will retain a copy of the XRF Inspection records for a period of 10 years after the inspection date.`,
    LEFT, y, { width: CONTENT_WIDTH }
  );

  addFooter(doc, biz);

  // PAGE 2 - Access + Pricing table
  doc.addPage();
  addHeader(doc, biz);
  y = 170;

  // Access & Scheduling Requirements
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
  doc.text("Access & Scheduling Requirements:", LEFT, y, { width: CONTENT_WIDTH });
  y = doc.y + 10;

  doc.font("Helvetica-Bold").fontSize(9).text("Access Coordination: ", LEFT, y, { width: CONTENT_WIDTH, continued: true });
  doc.font("Helvetica").text(`Property Management shall be responsible for scheduling and coordinating access to all required units for XRF scanning by ${biz.businessName}.`);
  y = doc.y + 6;

  doc.font("Helvetica-Bold").fontSize(9).text("Required Access: ", LEFT, y, { width: CONTENT_WIDTH, continued: true });
  doc.font("Helvetica").text("Property Management must ensure that designated units are accessible on the scheduled inspection date.");
  y = doc.y + 6;

  doc.font("Helvetica-Bold").fontSize(9).text("Standby Fee: ", LEFT, y, { width: CONTENT_WIDTH, continued: true });
  doc.font("Helvetica").text(`If ${biz.businessName}\u2019s XRF technician arrives on-site as scheduled and Property Management is unable to provide access to any unit for inspection, ${biz.businessName} reserves the right to charge a $500.00 standby fee for that day.`);
  y = doc.y + 15;

  const colW = [CONTENT_WIDTH * 0.34, CONTENT_WIDTH * 0.19, CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.25];

  y = drawTable(doc, y, [
    { cells: [{ text: "", bold: true }, { text: "Quantity", bold: true }, { text: "Price", bold: true }, { text: "Total", bold: true }], height: 26 },
    { cells: [{ text: "Studios & 1-Bedroom", bold: true }, { text: showStudios ? fmtQty(data.num_studios_1bed) : "N/A" }, { text: showStudios ? fmt(data.xrf_price_studios_1bed) : "N/A" }, { text: showStudios ? fmt(studiosTotal || null) : "N/A" }], height: 30 },
    { cells: [{ text: "2 & 3-Bedroom", bold: true }, { text: showBeds ? fmtQty(data.num_2_3bed) : "N/A" }, { text: showBeds ? fmt(data.xrf_price_2_3bed) : "N/A" }, { text: showBeds ? fmt(bedsTotal || null) : "N/A" }], height: 30 },
    { cells: [{ text: "Common Area\n(i.e. staircases, laundry room,\nlobby, gym, public hallways\nand spaces)", bold: true, size: 8 }, { text: showCommon ? fmtQty(data.num_common_spaces) : "N/A" }, { text: showCommon ? fmt(data.xrf_price_per_common_space) : "N/A" }, { text: showCommon ? fmt(commonTotal || null) : "N/A" }], height: 58 },
    { cells: [{ text: taxLabel, bold: true }, { text: "" }, { text: "" }, { text: subtotal > 0 ? fmt(tax) : "TBD" }], height: 30 },
    { cells: [{ text: "TOTAL", bold: true }, { text: "" }, { text: "" }, { text: subtotal > 0 ? fmt(total) : "TBD", bold: true }], height: 30 },
  ], colW);

  y += 15;
  y = addPaymentTerms(doc, y, 60);
  y += 10;
  addSignatureBlock(doc, y);
  addFooter(doc, biz);

  doc.end();
  return bufferPromise;
}

export async function generateDustSwabsProposal(data: ProposalData, jobInfo: ProposalJobInfo, taxRate: number, business?: ProposalBusinessInfo): Promise<Buffer> {
  const biz = {
    businessName: business?.businessName || PROPOSAL_DEFAULTS.businessName,
    businessAddress: business?.businessAddress || PROPOSAL_DEFAULTS.businessAddress,
    businessPhone: business?.businessPhone || PROPOSAL_DEFAULTS.businessPhone,
    certificationNumber: business?.certificationNumber || PROPOSAL_DEFAULTS.certificationNumber,
  };
  const bizLLC = biz.businessName.includes("LLC") ? biz.businessName : `${biz.businessName} LLC`;
  const doc = createDoc();
  const bufferPromise = docToBuffer(doc);

  const proposalNum = String(jobInfo.job_number);
  const date = todayFormatted();

  const siteVisitRate = data.dust_swab_site_visit_rate;
  const projMgmtRate = data.dust_swab_proj_mgmt_rate;
  const wipeRate = data.wipe_rate;
  const numWipes = data.num_wipes;
  const showWipes = data.has_wipes !== false;

  const siteVisitTotal = siteVisitRate ?? 0;
  const projMgmtTotal = projMgmtRate ?? 0;
  const wipesTotal = showWipes ? (numWipes ?? 0) * (wipeRate ?? 0) : 0;
  const subtotal = siteVisitTotal + projMgmtTotal + wipesTotal;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const taxLabel = `New York State Tax\n${(taxRate * 100).toFixed(2)}%`;

  // PAGE 1
  addHeader(doc, biz);
  drawProposalNumber(doc, proposalNum);
  let y = drawInfoBox(doc, {
    client: jobInfo.client_company ?? "",
    date,
    address: data.building_address ?? "",
    units: fmtQty(data.num_units),
  });

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
  doc.text("Scope of Work:", LEFT, y, { width: CONTENT_WIDTH });
  y = doc.y + 8;

  doc.font("Helvetica").fontSize(9.5);
  [
    "A Licensed EPA Lead Inspector or Risk Assessor will conduct lead dust wipe sampling within the tenant space in accordance with NYC Local Law 31 and HPD requirements.",
    "Dust wipe samples will be collected from required surfaces, including floors, window sills, and window wells, following NYC DOHMH and HUD protocols.",
    "Samples will be analyzed by a NYSDOH-certified laboratory using EPA-approved analytical methods to determine lead dust levels and clearance compliance.",
    `Upon completion of sampling and receipt of laboratory results, ${bizLLC} will provide signed documentation verifying that the apartment has been tested in accordance with NYC Local Law 31.`,
  ].forEach((b) => {
    doc.text("  \u2022   " + b, LEFT, y, { width: CONTENT_WIDTH });
    y = doc.y + 5;
  });

  y += 10;
  const colW = [CONTENT_WIDTH * 0.34, CONTENT_WIDTH * 0.19, CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.25];

  y = drawTable(doc, y, [
    { cells: [{ text: "Description", bold: true }, { text: "Quantity", bold: true }, { text: "Unit Rate", bold: true }, { text: "Total", bold: true }], height: 26 },
    { cells: [{ text: "Site Visit by EPA certified\nLead Inspector or Risk\nAssessor", size: 9 }, { text: "1" }, { text: fmt(siteVisitRate) }, { text: fmt(siteVisitTotal || null) }], height: 42 },
    { cells: [{ text: "Project management &\nReport Preparation", size: 9 }, { text: "1" }, { text: fmt(projMgmtRate) }, { text: fmt(projMgmtTotal || null) }], height: 35 },
    { cells: [{ text: "Lead Dust Wipes:\n(24 Hour Turn Around Time)", size: 9 }, { text: showWipes ? fmtQty(numWipes) : "N/A" }, { text: showWipes ? fmt(wipeRate) : "N/A" }, { text: showWipes ? fmt(wipesTotal || null) : "N/A" }], height: 35 },
    { cells: [{ text: taxLabel, bold: true }, { text: "" }, { text: "" }, { text: subtotal > 0 ? fmt(tax) : "TBD" }], height: 30 },
    { cells: [{ text: "TOTAL", bold: true }, { text: "" }, { text: "" }, { text: subtotal > 0 ? fmt(total) : "TBD", bold: true }], height: 28 },
  ], colW);

  y += 15;
  doc.font("Helvetica").fontSize(9).fillColor("#000000");
  doc.text("The number of samples listed herein is an ", LEFT, y, { width: CONTENT_WIDTH, continued: true });
  doc.font("Helvetica-Bold").text("estimate only. ", { continued: true });
  doc.font("Helvetica").text("The final invoice shall be adjusted to reflect the ", { continued: true });
  doc.font("Helvetica-Bold").text("actual number of samples collected and analyzed ", { continued: true });
  doc.font("Helvetica").text("during the course of the work.");

  addFooter(doc, biz);

  // PAGE 2 - Terms + Signature
  doc.addPage();
  addHeader(doc, biz);
  y = 170;

  y = addAccessScheduling(doc, y);
  y = addPaymentTerms(doc, y, 60);
  y += 10;
  addSignatureBlock(doc, y);
  addFooter(doc, biz);

  doc.end();
  return bufferPromise;
}

export async function generateAsbestosProposal(data: ProposalData, jobInfo: ProposalJobInfo, taxRate: number, business?: ProposalBusinessInfo): Promise<Buffer> {
  const biz = {
    businessName: business?.businessName || PROPOSAL_DEFAULTS.businessName,
    businessAddress: business?.businessAddress || PROPOSAL_DEFAULTS.businessAddress,
    businessPhone: business?.businessPhone || PROPOSAL_DEFAULTS.businessPhone,
    certificationNumber: business?.certificationNumber || PROPOSAL_DEFAULTS.certificationNumber,
  };
  const doc = createDoc();
  const bufferPromise = docToBuffer(doc);

  const proposalNum = String(jobInfo.job_number);
  const date = todayFormatted();

  const siteVisitRate = data.asbestos_site_visit_rate;
  const numSamples = data.num_asbestos_samples;
  const sampleRate = data.asbestos_sample_rate;
  const showSamples = data.has_asbestos_samples !== false;

  const siteVisitTotal = siteVisitRate ?? 0;
  const samplesTotal = showSamples ? (numSamples ?? 0) * (sampleRate ?? 0) : 0;
  const subtotal = siteVisitTotal + samplesTotal;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const taxLabel = `New York State Tax\n${(taxRate * 100).toFixed(2)}%`;

  // PAGE 1
  addHeader(doc, biz);
  drawProposalNumber(doc, proposalNum);
  let y = drawInfoBox(doc, {
    client: jobInfo.client_company ?? "",
    date,
    address: data.building_address ?? "",
    units: fmtQty(data.num_units),
  });

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000");
  doc.text("Scope of Work \u2013 Asbestos Inspection", LEFT, y, { width: CONTENT_WIDTH });
  y = doc.y + 8;

  doc.font("Helvetica").fontSize(9.5);
  doc.text(
    "A NYS-certified Asbestos Inspector will conduct a visual inspection of the project area in accordance with NYC DEP Asbestos Control Program, NYS Industrial Code Rule 56, and EPA NESHAP requirements.",
    LEFT, y, { width: CONTENT_WIDTH }
  );
  y = doc.y + 8;

  [
    "Suspect asbestos-containing materials will be identified and representative bulk samples collected following regulatory sampling protocols.",
    "Samples will be submitted to a NYS ELAP-certified laboratory for analysis using EPA-approved methods to determine asbestos content.",
    "All laboratory results and inspection findings will be reviewed for accuracy and regulatory compliance by a NYS-certified Asbestos Investigator, as required by NYC DEP regulations.",
    "Upon completion of review, a signed and certified asbestos survey report will be issued by the Asbestos Investigator, suitable for submission to NYC DEP and NYC DOB, as required.",
  ].forEach((b) => {
    doc.font("Helvetica").fontSize(9.5);
    doc.text("  \u2022   " + b, LEFT, y, { width: CONTENT_WIDTH });
    y = doc.y + 5;
  });

  y += 10;
  const colW = [CONTENT_WIDTH * 0.34, CONTENT_WIDTH * 0.19, CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.25];

  y = drawTable(doc, y, [
    { cells: [{ text: "Description", bold: true }, { text: "Quantity", bold: true }, { text: "Unit Rate", bold: true }, { text: "Total", bold: true }], height: 26 },
    { cells: [{ text: "Site Visit by certified\nAsbestos inspector", size: 9 }, { text: "1" }, { text: fmt(siteVisitRate) }, { text: fmt(siteVisitTotal || null) }], height: 35 },
    { cells: [{ text: "Asbestos Surface Wipe\nSampling:\n(24 Hour Turn Around Time)", size: 9 }, { text: showSamples ? fmtQty(numSamples) : "N/A" }, { text: showSamples ? fmt(sampleRate) : "N/A" }, { text: showSamples ? fmt(samplesTotal || null) : "N/A" }], height: 42 },
    { cells: [{ text: taxLabel, bold: true }, { text: "" }, { text: "" }, { text: subtotal > 0 ? fmt(tax) : "TBD" }], height: 30 },
    { cells: [{ text: "TOTAL", bold: true }, { text: "" }, { text: "" }, { text: subtotal > 0 ? fmt(total) : "TBD", bold: true }], height: 28 },
  ], colW);

  y += 15;
  doc.font("Helvetica").fontSize(9).fillColor("#000000");
  doc.text("The number of samples listed herein is an ", LEFT, y, { width: CONTENT_WIDTH, continued: true });
  doc.font("Helvetica-Bold").text("estimate only. ", { continued: true });
  doc.font("Helvetica").text("The final invoice shall be adjusted to reflect the ", { continued: true });
  doc.font("Helvetica-Bold").text("actual number of samples collected and analyzed ", { continued: true });
  doc.font("Helvetica").text("during the course of the work.");

  addFooter(doc, biz);

  // PAGE 2 - Terms + Signature
  doc.addPage();
  addHeader(doc, biz);
  y = 170;

  y = addAccessScheduling(doc, y);
  y = addPaymentTerms(doc, y, 14);
  y += 10;
  addSignatureBlock(doc, y);
  addFooter(doc, biz);

  doc.end();
  return bufferPromise;
}

export async function generateProposals(data: ProposalData, jobInfo: ProposalJobInfo, taxRate: number, business?: ProposalBusinessInfo): Promise<GeneratedProposal[]> {
  const proposals: GeneratedProposal[] = [];
  const slug = addressSlug(data.building_address);

  if (data.has_xrf) {
    const buffer = await generateXRFProposal(data, jobInfo, taxRate, business);
    proposals.push({
      type: "xrf",
      buffer,
      filename: `proposal-xrf-${slug}.pdf`,
    });
  }

  if (data.has_dust_swab) {
    const buffer = await generateDustSwabsProposal(data, jobInfo, taxRate, business);
    proposals.push({
      type: "dust_swab",
      buffer,
      filename: `proposal-dust-swab-${slug}.pdf`,
    });
  }

  if (data.has_asbestos) {
    const buffer = await generateAsbestosProposal(data, jobInfo, taxRate, business);
    proposals.push({
      type: "asbestos",
      buffer,
      filename: `proposal-asbestos-${slug}.pdf`,
    });
  }

  return proposals;
}
