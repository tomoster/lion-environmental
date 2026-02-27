import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const LOGO_PATH = path.join(process.cwd(), "public", "images", "lion-logo.png");

const PAGE_WIDTH = 612;
const LEFT = 72;
const RIGHT = PAGE_WIDTH - 72;
const CONTENT_WIDTH = RIGHT - LEFT; // 468

const TAX_RATE = 0.0888;

type ProposalData = {
  job_number: number;
  client_company: string | null;
  building_address: string | null;
  num_units: number | null;
  has_xrf: boolean;
  has_dust_swab: boolean;
  has_asbestos: boolean;
  price_per_unit: number | null;
  num_common_spaces: number | null;
  price_per_common_space: number | null;
  num_wipes: number | null;
  wipe_rate: number | null;
  dust_swab_site_visit_rate: number | null;
  dust_swab_proj_mgmt_rate: number | null;
  num_asbestos_samples: number | null;
  asbestos_sample_rate: number | null;
  asbestos_site_visit_rate: number | null;
};

type GeneratedProposal = {
  type: "xrf" | "dust_swab" | "asbestos";
  buffer: Buffer;
  filename: string;
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
    margins: { top: 50, bottom: 80, left: LEFT, right: 72 },
  });
}

function addHeader(doc: InstanceType<typeof PDFDocument>) {
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, PAGE_WIDTH / 2 - 40, 35, { width: 80 });
  }
  doc.fontSize(20).font("Helvetica-Bold");
  doc.text("Lion Environmental", LEFT, 120, { width: CONTENT_WIDTH, align: "center" });
}

function addFooter(doc: InstanceType<typeof PDFDocument>) {
  const saved = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.fontSize(8).font("Helvetica").fillColor("#000000");
  doc.text("276 Fifth Avenue, Suite 704, PMB 70053, New York, NY 10001", LEFT, 720, {
    width: CONTENT_WIDTH, align: "center", lineBreak: false,
  });
  doc.text("P: 267-973-9206", LEFT, 732, {
    width: CONTENT_WIDTH, align: "center", lineBreak: false,
  });
  doc.page.margins.bottom = saved;
}

function drawInfoBox(doc: InstanceType<typeof PDFDocument>, data: { client: string; date: string; address: string; units: string }) {
  const y = 155;
  const midX = LEFT + CONTENT_WIDTH / 2;
  const rowH = 22;

  doc.lineWidth(0.5).strokeColor("#000000").fillColor("#000000");
  doc.rect(LEFT, y, CONTENT_WIDTH, rowH * 2).stroke();
  doc.moveTo(LEFT, y + rowH).lineTo(RIGHT, y + rowH).stroke();
  doc.moveTo(midX, y).lineTo(midX, y + rowH * 2).stroke();

  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Client:", LEFT + 5, y + 6, { lineBreak: false });
  doc.font("Helvetica").text(data.client || "", LEFT + 48, y + 6, { width: midX - LEFT - 55, lineBreak: false });
  doc.font("Helvetica-Bold").text("Date:", midX + 5, y + 6, { lineBreak: false });
  doc.font("Helvetica").text(data.date || "", midX + 40, y + 6, { lineBreak: false });

  doc.font("Helvetica-Bold").text("Project Address:", LEFT + 5, y + rowH + 6, { lineBreak: false });
  doc.font("Helvetica").text(data.address || "", LEFT + 95, y + rowH + 6, { width: midX - LEFT - 102, lineBreak: false });
  doc.font("Helvetica-Bold").text("Units:", midX + 5, y + rowH + 6, { lineBreak: false });
  doc.font("Helvetica").text(data.units || "", midX + 40, y + rowH + 6, { lineBreak: false });

  return y + rowH * 2 + 15;
}

function drawProposalNumber(doc: InstanceType<typeof PDFDocument>, num: string) {
  doc.font("Helvetica-Bold").fontSize(11);
  doc.text(`Proposal #${num}`, RIGHT - 110, 130, { width: 110, align: "right", lineBreak: false });
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

function addIntroMessage(doc: InstanceType<typeof PDFDocument>, y: number, serviceLabel: string, clientCompany: string | null, buildingAddress: string | null) {
  const client = clientCompany || "your organization";
  const address = buildingAddress || "your property";

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000");
  doc.text(`${serviceLabel} Proposal`, LEFT, y, { width: CONTENT_WIDTH });
  y = doc.y + 12;

  doc.font("Helvetica").fontSize(10);
  doc.text(
    `Thank you for the opportunity to provide this proposal for ${client} at ${address}. We appreciate your consideration and look forward to working with you.`,
    LEFT, y, { width: CONTENT_WIDTH }
  );
  y = doc.y + 8;
  doc.text(
    "Please review the pricing below. If you have any questions or would like to move forward, don't hesitate to reach out \u2014 we're happy to help.",
    LEFT, y, { width: CONTENT_WIDTH }
  );

  return doc.y + 20;
}

function addSignatureBlock(doc: InstanceType<typeof PDFDocument>, y: number) {
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000");
  doc.text("This correctly sets forth understanding of the client. Client Agrees to all Terms and Conditions.", LEFT, y, { width: CONTENT_WIDTH });
  y = doc.y + 30;

  const lineEnd = LEFT + 280;
  doc.font("Helvetica-Bold").fontSize(10);

  doc.text("Accepted By:", LEFT, y, { lineBreak: false });
  doc.moveTo(LEFT + 85, y + 13).lineTo(lineEnd, y + 13).lineWidth(0.5).stroke();
  y += 35;

  doc.text("Signature:", LEFT, y, { lineBreak: false });
  doc.moveTo(LEFT + 75, y + 13).lineTo(lineEnd, y + 13).stroke();
  y += 35;

  doc.text("Date:", LEFT, y, { lineBreak: false });
  doc.moveTo(LEFT + 45, y + 13).lineTo(lineEnd, y + 13).stroke();
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

export async function generateXRFProposal(data: ProposalData): Promise<Buffer> {
  const doc = createDoc();
  const bufferPromise = docToBuffer(doc);

  const proposalNum = String(data.job_number);
  const date = todayFormatted();

  const unitsTotal = (data.num_units ?? 0) * (data.price_per_unit ?? 0);
  const commonTotal = (data.num_common_spaces ?? 0) * (data.price_per_common_space ?? 0);
  const subtotal = unitsTotal + commonTotal;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  addHeader(doc);
  drawProposalNumber(doc, proposalNum);
  let y = drawInfoBox(doc, {
    client: data.client_company ?? "",
    date,
    address: data.building_address ?? "",
    units: fmtQty(data.num_units),
  });

  y = addIntroMessage(doc, y, "Lead Paint Testing (XRF)", data.client_company, data.building_address);

  const colW = [CONTENT_WIDTH * 0.34, CONTENT_WIDTH * 0.19, CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.25];

  y = drawTable(doc, y, [
    { cells: [{ text: "Description", bold: true }, { text: "Quantity", bold: true }, { text: "Price", bold: true }, { text: "Total", bold: true }], height: 26 },
    { cells: [{ text: "Units", bold: true }, { text: fmtQty(data.num_units) }, { text: fmt(data.price_per_unit) }, { text: fmt(unitsTotal || null) }], height: 30 },
    { cells: [{ text: "Common Area\n(i.e. staircases, laundry room,\nlobby, gym, public hallways\nand spaces)", bold: true, size: 8 }, { text: fmtQty(data.num_common_spaces) }, { text: fmt(data.price_per_common_space) }, { text: fmt(commonTotal || null) }], height: 58 },
    { cells: [{ text: "New York State Tax\n8.8%", bold: true }, { text: "" }, { text: "" }, { text: subtotal > 0 ? fmt(tax) : "TBD" }], height: 30 },
    { cells: [{ text: "TOTAL", bold: true }, { text: "" }, { text: "" }, { text: subtotal > 0 ? fmt(total) : "TBD", bold: true }], height: 30 },
  ], colW);

  y += 25;
  addSignatureBlock(doc, y);
  addFooter(doc);

  doc.end();
  return bufferPromise;
}

export async function generateDustSwabsProposal(data: ProposalData): Promise<Buffer> {
  const doc = createDoc();
  const bufferPromise = docToBuffer(doc);

  const proposalNum = String(data.job_number);
  const date = todayFormatted();

  const siteVisitRate = data.dust_swab_site_visit_rate;
  const projMgmtRate = data.dust_swab_proj_mgmt_rate;
  const wipeRate = data.wipe_rate;
  const numWipes = data.num_wipes;

  const siteVisitTotal = siteVisitRate ?? 0;
  const projMgmtTotal = projMgmtRate ?? 0;
  const wipesTotal = (numWipes ?? 0) * (wipeRate ?? 0);
  const subtotal = siteVisitTotal + projMgmtTotal + wipesTotal;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  addHeader(doc);
  drawProposalNumber(doc, proposalNum);
  let y = drawInfoBox(doc, {
    client: data.client_company ?? "",
    date,
    address: data.building_address ?? "",
    units: fmtQty(data.num_units),
  });

  y = addIntroMessage(doc, y, "Dust Wipe Sampling", data.client_company, data.building_address);

  const colW = [CONTENT_WIDTH * 0.34, CONTENT_WIDTH * 0.19, CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.25];

  y = drawTable(doc, y, [
    { cells: [{ text: "Description", bold: true }, { text: "Quantity", bold: true }, { text: "Price", bold: true }, { text: "Total", bold: true }], height: 26 },
    { cells: [{ text: "Site Visit by EPA certified\nLead Inspector or Risk\nAssessor", size: 9 }, { text: "1" }, { text: fmt(siteVisitRate) }, { text: fmt(siteVisitTotal || null) }], height: 42 },
    { cells: [{ text: "Project management &\nReport Preparation", size: 9 }, { text: "1" }, { text: fmt(projMgmtRate) }, { text: fmt(projMgmtTotal || null) }], height: 35 },
    { cells: [{ text: "Lead Dust Wipes:\n(24 Hour Turn Around Time)", size: 9 }, { text: fmtQty(numWipes) }, { text: fmt(wipeRate) }, { text: fmt(wipesTotal || null) }], height: 35 },
    { cells: [{ text: "New York State Tax\n8.8%", bold: true }, { text: "" }, { text: "" }, { text: subtotal > 0 ? fmt(tax) : "TBD" }], height: 30 },
    { cells: [{ text: "TOTAL", bold: true }, { text: "" }, { text: "" }, { text: subtotal > 0 ? fmt(total) : "TBD", bold: true }], height: 30 },
  ], colW);

  y += 25;
  addSignatureBlock(doc, y);
  addFooter(doc);

  doc.end();
  return bufferPromise;
}

export async function generateAsbestosProposal(data: ProposalData): Promise<Buffer> {
  const doc = createDoc();
  const bufferPromise = docToBuffer(doc);

  const proposalNum = String(data.job_number);
  const date = todayFormatted();

  const siteVisitRate = data.asbestos_site_visit_rate;
  const numSamples = data.num_asbestos_samples;
  const sampleRate = data.asbestos_sample_rate;

  const siteVisitTotal = siteVisitRate ?? 0;
  const samplesTotal = (numSamples ?? 0) * (sampleRate ?? 0);
  const subtotal = siteVisitTotal + samplesTotal;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  addHeader(doc);
  drawProposalNumber(doc, proposalNum);
  let y = drawInfoBox(doc, {
    client: data.client_company ?? "",
    date,
    address: data.building_address ?? "",
    units: fmtQty(data.num_units),
  });

  y = addIntroMessage(doc, y, "Asbestos Testing", data.client_company, data.building_address);

  const colW = [CONTENT_WIDTH * 0.34, CONTENT_WIDTH * 0.19, CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.25];

  y = drawTable(doc, y, [
    { cells: [{ text: "Description", bold: true }, { text: "Quantity", bold: true }, { text: "Price", bold: true }, { text: "Total", bold: true }], height: 26 },
    { cells: [{ text: "Site Visit by certified\nAsbestos inspector", size: 9 }, { text: "1" }, { text: fmt(siteVisitRate) }, { text: fmt(siteVisitTotal || null) }], height: 35 },
    { cells: [{ text: "Asbestos Surface Wipe\nSampling:\n(24 Hour Turn Around Time)", size: 9 }, { text: fmtQty(numSamples) }, { text: fmt(sampleRate) }, { text: fmt(samplesTotal || null) }], height: 42 },
    { cells: [{ text: "New York State Tax\n8.8%", bold: true }, { text: "" }, { text: "" }, { text: subtotal > 0 ? fmt(tax) : "TBD" }], height: 30 },
    { cells: [{ text: "TOTAL", bold: true }, { text: "" }, { text: "" }, { text: subtotal > 0 ? fmt(total) : "TBD", bold: true }], height: 30 },
  ], colW);

  y += 25;
  addSignatureBlock(doc, y);
  addFooter(doc);

  doc.end();
  return bufferPromise;
}

export async function generateProposals(data: ProposalData): Promise<GeneratedProposal[]> {
  const proposals: GeneratedProposal[] = [];

  if (data.has_xrf) {
    const buffer = await generateXRFProposal(data);
    proposals.push({
      type: "xrf",
      buffer,
      filename: `proposal-xrf-job-${data.job_number}.pdf`,
    });
  }

  if (data.has_dust_swab) {
    const buffer = await generateDustSwabsProposal(data);
    proposals.push({
      type: "dust_swab",
      buffer,
      filename: `proposal-dust-swab-job-${data.job_number}.pdf`,
    });
  }

  if (data.has_asbestos) {
    const buffer = await generateAsbestosProposal(data);
    proposals.push({
      type: "asbestos",
      buffer,
      filename: `proposal-asbestos-job-${data.job_number}.pdf`,
    });
  }

  return proposals;
}
