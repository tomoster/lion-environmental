const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const doc = new PDFDocument({ size: "LETTER", margins: { top: 60, bottom: 60, left: 72, right: 72 }, bufferPages: true });
const outputPath = path.join(__dirname, "..", "sample-proposal.pdf");
doc.pipe(fs.createWriteStream(outputPath));

const PAGE_WIDTH = 612;
const CONTENT_WIDTH = PAGE_WIDTH - 144;

function centeredText(text, y, options = {}) {
  doc.text(text, 72, y, { width: CONTENT_WIDTH, align: "center", ...options });
}

function drawLine(y) {
  doc.moveTo(72, y).lineTo(PAGE_WIDTH - 72, y).stroke("#cccccc");
}

// Header
doc.fontSize(24).font("Helvetica-Bold");
centeredText("Lion Environmental", 60);

doc.moveDown(0.5);

// Proposal info
const infoY = 110;
doc.fontSize(10).font("Helvetica");
doc.text("NYC Local Law 31 Lead Based Paint Inspection Proposal", 72, infoY, { width: CONTENT_WIDTH });
doc.font("Helvetica-Bold").text("Proposal #416", 72, infoY, { width: CONTENT_WIDTH, align: "right" });

doc.font("Helvetica").fontSize(10);
doc.text("Date: 01/14/2025", 72, infoY + 20);

doc.moveDown(1);

// Buildings
const buildY = infoY + 50;
doc.font("Helvetica-Bold").fontSize(10).text("Buildings:", 72, buildY);
doc.font("Helvetica").fontSize(10);
doc.text("150 Lefferts Ave, Brooklyn, NY 11255", 72, buildY + 18);
doc.text("55 E 21st St Brooklyn, NY 11226", 72, buildY + 32);

// Overview
const overviewY = buildY + 60;
doc.font("Helvetica-Bold").fontSize(10).text("Overview: ", 72, overviewY, { continued: true });
doc.font("Helvetica").text(
  "New York City's Local Law 31 of 2020 introduced new lead inspection requirements for landlords and building owners, enforced by the NYC Department of Housing Preservation & Development (HPD).",
  { width: CONTENT_WIDTH }
);

doc.moveDown(0.5);
doc.text(
  "Over the past few years, New York City has made several important updates to the NYC Childhood Lead Poisoning Prevention Act (Local Law 1 of 2004), strengthening existing lead laws and expanding inspection requirements for landlords and building owners.",
  72,
  undefined,
  { width: CONTENT_WIDTH }
);

doc.moveDown(0.5);
doc.text(
  'Local Law 31 of 2020 is the most recent update, which went into effect on August 9, 2020 and mandates X-Ray Fluorescence (XRF) lead inspections by Environmental Protection Agency (EPA)-certified inspectors to test for the presence of lead-based paint in old residential "multiple dwelling" buildings.',
  72,
  undefined,
  { width: CONTENT_WIDTH }
);

doc.moveDown(0.5);
doc.text(
  "Local Law 31 also includes a 5-year testing requirement, meaning that all residential building owners in NYC must have all dwelling units inspected for lead paint by August 9, 2025.",
  72,
  undefined,
  { width: CONTENT_WIDTH }
);

doc.moveDown(0.5);
doc.text(
  "Apartments with children under the age of 6 residing, must be inspected within one year of the law. If a family with a child under the age of 6 recently moved into an apartment, lead testing must be completed within 1 year of their move-in date.",
  72,
  undefined,
  { width: CONTENT_WIDTH }
);

// Scope of Work
doc.moveDown(1);
doc.font("Helvetica-Bold").fontSize(10).text("Scope of Work:", 72, undefined, { width: CONTENT_WIDTH });
doc.font("Helvetica").fontSize(10);
doc.moveDown(0.3);
doc.text(
  "  \u2022  A Licensed EPA Lead Inspector will conduct a comprehensive XRF inspection on the entire Tenant space as per HPD requirements.",
  72,
  undefined,
  { width: CONTENT_WIDTH }
);
doc.moveDown(0.3);
doc.text(
  "  \u2022  Lead based paint will be determined using an XRF calibrated to .5 mg/cm2 in accordance with Local Law 66.",
  72,
  undefined,
  { width: CONTENT_WIDTH }
);
doc.moveDown(0.3);
doc.text(
  "  \u2022  Upon completion of the inspection, Lion Environmental will provide signed documentation to the client verifying that the Apartment has been inspected in accordance with Local Law 31.",
  72,
  undefined,
  { width: CONTENT_WIDTH }
);

doc.moveDown(0.5);
doc.font("Helvetica-Bold").text(
  "Lion Environmental and property owner will retain a copy of the XRF Inspection records for a period of 10 years after the inspection date.",
  72,
  undefined,
  { width: CONTENT_WIDTH }
);

// Payment and Terms heading
doc.moveDown(1);
doc.font("Helvetica-Bold").fontSize(10).text("Payment and Terms", 72);
doc.moveDown(0.5);

// --- PAGE 2 ---
doc.addPage();

doc.fontSize(24).font("Helvetica-Bold");
centeredText("Lion Environmental", 60);

doc.moveDown(2);

// Pricing table
const tableTop = 120;
const col1 = 72;
const col2 = 230;
const col3 = 340;
const col4 = 440;
const rowHeight = 30;

// Dynamic data
const units = 18;
const pricePerUnit = 170;
const commonAreas = 0;
const pricePerCommon = 0;
const unitsTotal = units * pricePerUnit;
const commonTotal = commonAreas > 0 ? commonAreas * pricePerCommon : 0;
const subtotal = unitsTotal + commonTotal;
const taxRate = 0.088;
const tax = Math.round(subtotal * taxRate * 100) / 100;
const total = subtotal + tax;

function drawTableRow(y, cells, bold = false) {
  const font = bold ? "Helvetica-Bold" : "Helvetica";
  doc.font(font).fontSize(10);
  doc.text(cells[0] || "", col1, y + 8, { width: col2 - col1 - 10 });
  doc.text(cells[1] || "", col2, y + 8, { width: col3 - col2 - 10, align: "center" });
  doc.text(cells[2] || "", col3, y + 8, { width: col4 - col3 - 10, align: "center" });
  doc.text(cells[3] || "", col4, y + 8, { width: PAGE_WIDTH - 72 - col4, align: "right" });
}

function drawTableBorders(y, height) {
  doc.rect(col1, y, PAGE_WIDTH - 144, height).stroke("#000000");
  doc.moveTo(col2, y).lineTo(col2, y + height).stroke("#000000");
  doc.moveTo(col3, y).lineTo(col3, y + height).stroke("#000000");
  doc.moveTo(col4, y).lineTo(col4, y + height).stroke("#000000");
}

// Header row
doc.rect(col1, tableTop, PAGE_WIDTH - 144, rowHeight).fillAndStroke("#f0f0f0", "#000000");
doc.moveTo(col2, tableTop).lineTo(col2, tableTop + rowHeight).stroke("#000000");
doc.moveTo(col3, tableTop).lineTo(col3, tableTop + rowHeight).stroke("#000000");
doc.moveTo(col4, tableTop).lineTo(col4, tableTop + rowHeight).stroke("#000000");
doc.fillColor("#000000");
drawTableRow(tableTop, ["", "Quantity", "Price", "Total"], true);

// Units row
let currentY = tableTop + rowHeight;
drawTableBorders(currentY, rowHeight);
drawTableRow(currentY, [
  "Units",
  units.toString(),
  `$${pricePerUnit}`,
  `$${unitsTotal.toLocaleString()}`,
], true);

// Common Area row
currentY += rowHeight;
const commonRowHeight = 60;
drawTableBorders(currentY, commonRowHeight);
doc.font("Helvetica-Bold").fontSize(9);
doc.text(
  "Common Area\n(i.e. staircases, laundry room, lobby, gym, public hallways and spaces)",
  col1 + 5,
  currentY + 5,
  { width: col2 - col1 - 15 }
);
doc.font("Helvetica-Bold").fontSize(10);
if (commonAreas > 0) {
  doc.text(commonAreas.toString(), col2, currentY + 20, { width: col3 - col2 - 10, align: "center" });
  doc.text(`$${pricePerCommon}`, col3, currentY + 20, { width: col4 - col3 - 10, align: "center" });
  doc.text(`$${commonTotal.toLocaleString()}`, col4, currentY + 20, { width: PAGE_WIDTH - 72 - col4, align: "right" });
} else {
  doc.text("N/A", col2, currentY + 20, { width: col3 - col2 - 10, align: "center" });
  doc.text("N/A", col3, currentY + 20, { width: col4 - col3 - 10, align: "center" });
  doc.text("N/A", col4, currentY + 20, { width: PAGE_WIDTH - 72 - col4, align: "right" });
}

// Tax row
currentY += commonRowHeight;
drawTableBorders(currentY, rowHeight);
drawTableRow(currentY, [
  "New York State Tax\n8.8%",
  "",
  "",
  `$${tax.toFixed(2)}`,
], true);

// Total row
currentY += rowHeight;
doc.rect(col1, currentY, PAGE_WIDTH - 144, rowHeight).fillAndStroke("#f0f0f0", "#000000");
doc.moveTo(col2, currentY).lineTo(col2, currentY + rowHeight).stroke("#000000");
doc.moveTo(col3, currentY).lineTo(col3, currentY + rowHeight).stroke("#000000");
doc.moveTo(col4, currentY).lineTo(col4, currentY + rowHeight).stroke("#000000");
doc.fillColor("#000000");
drawTableRow(currentY, ["TOTAL", "", "", `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`], true);

// Agreement text
currentY += rowHeight + 30;
doc.font("Helvetica").fontSize(10);
doc.text(
  "This correctly sets forth understanding of the client. Client Agrees to all Terms and Conditions.",
  72,
  currentY,
  { width: CONTENT_WIDTH }
);

// Signature lines
currentY += 40;
doc.text("Accepted By:", 72, currentY);
doc.moveTo(160, currentY + 12).lineTo(PAGE_WIDTH - 72, currentY + 12).stroke("#000000");

currentY += 35;
doc.text("Signature:", 72, currentY);
doc.moveTo(145, currentY + 12).lineTo(PAGE_WIDTH - 72, currentY + 12).stroke("#000000");

currentY += 35;
doc.text("Date:", 72, currentY);
doc.moveTo(110, currentY + 12).lineTo(350, currentY + 12).stroke("#000000");

// Footer on both pages
function addFooter() {
  doc.fontSize(8).font("Helvetica");
  doc.text("276 Fifth Avenue, Suite 704, PMB 70053, New York, NY 10001", 72, 710, {
    width: CONTENT_WIDTH,
    align: "center",
  });
  doc.text("P: 267-973-9206", 72, 722, {
    width: CONTENT_WIDTH,
    align: "center",
  });
}

// Add footer to page 2
addFooter();

// Go back to page 1 and add footer
doc.switchToPage(0);
addFooter();

doc.end();
console.log(`Generated: ${outputPath}`);
