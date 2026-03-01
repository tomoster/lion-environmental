const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const LOGO_PATH = path.join(__dirname, "..", "public", "images", "lion-logo.png");
const OUTPUT_DIR = path.join(__dirname, "..");

const PAGE_WIDTH = 612;
const LEFT = 72;
const RIGHT = PAGE_WIDTH - 72;
const CONTENT_WIDTH = RIGHT - LEFT; // 468

function createDoc() {
  return new PDFDocument({
    size: "LETTER",
    margins: { top: 50, bottom: 80, left: LEFT, right: 72 },
  });
}

function addHeader(doc) {
  doc.image(LOGO_PATH, PAGE_WIDTH / 2 - 40, 35, { width: 80 });
  doc.fontSize(20).font("Helvetica-Bold");
  doc.text("Lion Environmental", LEFT, 120, { width: CONTENT_WIDTH, align: "center" });
}

function addFooter(doc) {
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

function drawInfoBox(doc, data) {
  const y = 155;
  const midX = LEFT + CONTENT_WIDTH / 2;
  const rowH = 22;

  doc.lineWidth(0.5).strokeColor("#000000").fillColor("#000000");

  // Outer box - 2 rows
  doc.rect(LEFT, y, CONTENT_WIDTH, rowH * 2).stroke();
  // Horizontal divider
  doc.moveTo(LEFT, y + rowH).lineTo(RIGHT, y + rowH).stroke();
  // Vertical divider
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

function drawProposalNumber(doc, num) {
  doc.font("Helvetica-Bold").fontSize(11);
  doc.text(`Proposal #${num}`, RIGHT - 110, 130, { width: 110, align: "right", lineBreak: false });
}

function drawTable(doc, y, rows, colWidths) {
  const colX = [LEFT];
  for (let i = 0; i < colWidths.length - 1; i++) {
    colX.push(colX[i] + colWidths[i]);
  }

  doc.lineWidth(0.5).strokeColor("#000000").fillColor("#000000");

  rows.forEach((row) => {
    const rowH = row.height || 28;

    // Full row outline
    doc.rect(LEFT, y, CONTENT_WIDTH, rowH).stroke();

    // Column dividers
    for (let c = 1; c < colX.length; c++) {
      doc.moveTo(colX[c], y).lineTo(colX[c], y + rowH).stroke();
    }

    // Cell text
    row.cells.forEach((cell, ci) => {
      const font = cell.bold ? "Helvetica-Bold" : "Helvetica";
      const size = cell.size || 9;
      doc.font(font).fontSize(size).fillColor("#000000");
      const align = cell.align || (ci >= 1 ? "center" : "left");
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

function addAccessScheduling(doc, y) {
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

function addPaymentTerms(doc, y, days) {
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

function addSignatureBlock(doc, y) {
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

// ============================================================
// 1. XRF LEAD INSPECTION PROPOSAL (LL31)
// ============================================================
function generateXRFProposal() {
  const doc = createDoc();
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, "sample-proposal-xrf.pdf")));

  // PAGE 1
  addHeader(doc);
  drawProposalNumber(doc, "{{proposal_num}}");
  let y = drawInfoBox(doc, {
    client: "{{client_company}}",
    date: "{{date}}",
    address: "{{building_address}}",
    units: "{{num_units}}",
  });

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
  doc.text("NYC Local Law 31 Lead Based Paint Inspection Proposal", LEFT, y, { width: CONTENT_WIDTH });
  y = doc.y + 10;

  doc.font("Helvetica-Bold").fontSize(9.5).text("Overview: ", LEFT, y, { continued: true });
  doc.font("Helvetica").text(
    "New York City's Local Law 31 of 2020 introduced new lead inspection requirements for landlords and building owners, enforced by the NYC Department of Housing Preservation & Development (HPD)."
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
    "Upon completion of the inspection, Lion Environmental LLC will provide signed documentation to the client verifying that the Apartment has been inspected in accordance with Local Law 31.",
  ].forEach((b) => {
    doc.text("  \u2022   " + b, LEFT, y, { width: CONTENT_WIDTH });
    y = doc.y + 5;
  });

  y += 3;
  doc.font("Helvetica-Bold").fontSize(9.5);
  doc.text(
    "Lion Environmental and property owner will retain a copy of the XRF Inspection records for a period of 10 years after the inspection date.",
    LEFT, y, { width: CONTENT_WIDTH }
  );

  addFooter(doc);

  // PAGE 2 - Access + Pricing table
  doc.addPage();
  addHeader(doc);
  y = 155;

  // Access & Scheduling Requirements
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
  doc.text("Access & Scheduling Requirements:", LEFT, y, { width: CONTENT_WIDTH });
  y = doc.y + 10;

  doc.font("Helvetica-Bold").fontSize(9).text("Access Coordination: ", LEFT, y, { width: CONTENT_WIDTH, continued: true });
  doc.font("Helvetica").text("Property Management shall be responsible for scheduling and coordinating access to all required units for XRF scanning by Lion Environmental.");
  y = doc.y + 6;

  doc.font("Helvetica-Bold").fontSize(9).text("Required Access: ", LEFT, y, { width: CONTENT_WIDTH, continued: true });
  doc.font("Helvetica").text("Property Management must ensure that designated units are accessible on the scheduled inspection date.");
  y = doc.y + 6;

  doc.font("Helvetica-Bold").fontSize(9).text("Standby Fee: ", LEFT, y, { width: CONTENT_WIDTH, continued: true });
  doc.font("Helvetica").text("If Lion Environmental\u2019s XRF technician arrives on-site as scheduled and Property Management is unable to provide access to any unit for inspection, Lion Environmental reserves the right to charge a $500.00 standby fee for that day.");
  y = doc.y + 15;

  const colW = [CONTENT_WIDTH * 0.34, CONTENT_WIDTH * 0.19, CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.25];

  y = drawTable(doc, y, [
    { cells: [{ text: "", bold: true }, { text: "Quantity", bold: true }, { text: "Price", bold: true }, { text: "Total", bold: true }], height: 26 },
    { cells: [{ text: "Studios & 1-Bedroom", bold: true }, { text: "{{num_studios}}" }, { text: "{{price_studios}}" }, { text: "{{studios_total}}" }], height: 30 },
    { cells: [{ text: "2 & 3-Bedroom", bold: true }, { text: "{{num_2_3bed}}" }, { text: "{{price_2_3bed}}" }, { text: "{{beds_total}}" }], height: 30 },
    { cells: [{ text: "Common Area\n(i.e. staircases, laundry room,\nlobby, gym, public hallways\nand spaces)", bold: true, size: 8 }, { text: "{{num_common}}" }, { text: "{{price_per_common}}" }, { text: "{{common_total}}" }], height: 58 },
    { cells: [{ text: "New York State Tax\n8.8%", bold: true }, { text: "" }, { text: "" }, { text: "{{tax}}" }], height: 30 },
    { cells: [{ text: "TOTAL", bold: true }, { text: "" }, { text: "" }, { text: "{{total}}", bold: true }], height: 30 },
  ], colW);

  y += 25;
  addSignatureBlock(doc, y);
  addFooter(doc);

  doc.end();
  console.log("Generated: sample-proposal-xrf.pdf");
}

// ============================================================
// 2. LEAD DUST SWABS PROPOSAL
// ============================================================
function generateDustSwabsProposal() {
  const doc = createDoc();
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, "sample-proposal-dust-swabs.pdf")));

  // PAGE 1
  addHeader(doc);
  drawProposalNumber(doc, "{{proposal_num}}");
  let y = drawInfoBox(doc, {
    client: "{{client_company}}",
    date: "{{date}}",
    address: "{{building_address}}",
    units: "{{num_units}}",
  });

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
  doc.text("Scope of Work:", LEFT, y, { width: CONTENT_WIDTH });
  y = doc.y + 8;

  doc.font("Helvetica").fontSize(9.5);
  [
    "A Licensed EPA Lead Inspector or Risk Assessor will conduct lead dust wipe sampling within the tenant space in accordance with NYC Local Law 31 and HPD requirements.",
    "Dust wipe samples will be collected from required surfaces, including floors, window sills, and window wells, following NYC DOHMH and HUD protocols.",
    "Samples will be analyzed by a NYSDOH-certified laboratory using EPA-approved analytical methods to determine lead dust levels and clearance compliance.",
    "Upon completion of sampling and receipt of laboratory results, Lion Environmental LLC will provide signed documentation verifying that the apartment has been tested in accordance with NYC Local Law 31.",
  ].forEach((b) => {
    doc.text("  \u2022   " + b, LEFT, y, { width: CONTENT_WIDTH });
    y = doc.y + 5;
  });

  y += 10;
  const colW = [CONTENT_WIDTH * 0.34, CONTENT_WIDTH * 0.19, CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.25];

  y = drawTable(doc, y, [
    { cells: [{ text: "Description", bold: true }, { text: "Quantity", bold: true }, { text: "Unit Rate", bold: true }, { text: "Total", bold: true }], height: 26 },
    { cells: [{ text: "Site Visit by EPA certified\nLead Inspector or Risk\nAssessor", size: 9 }, { text: "1" }, { text: "{{site_visit_rate}}" }, { text: "{{site_visit_total}}" }], height: 42 },
    { cells: [{ text: "Project management &\nReport Preparation", size: 9 }, { text: "1" }, { text: "{{proj_mgmt_rate}}" }, { text: "{{proj_mgmt_total}}" }], height: 35 },
    { cells: [{ text: "Lead Dust Wipes:\n(24 Hour Turn Around Time)", size: 9 }, { text: "{{num_wipes}}" }, { text: "{{wipe_rate}}" }, { text: "{{wipes_total}}" }], height: 35 },
    { cells: [{ text: "New York State Tax\n8.8%", bold: true }, { text: "" }, { text: "" }, { text: "{{tax}}" }], height: 30 },
    { cells: [{ text: "TOTAL", bold: true }, { text: "" }, { text: "" }, { text: "{{total}}", bold: true }], height: 28 },
  ], colW);

  y += 15;
  doc.font("Helvetica").fontSize(9).fillColor("#000000");
  doc.text("The number of samples listed herein is an ", LEFT, y, { width: CONTENT_WIDTH, continued: true });
  doc.font("Helvetica-Bold").text("estimate only. ", { continued: true });
  doc.font("Helvetica").text("The final invoice shall be adjusted to reflect the ", { continued: true });
  doc.font("Helvetica-Bold").text("actual number of samples collected and analyzed ", { continued: true });
  doc.font("Helvetica").text("during the course of the work.");

  addFooter(doc);

  // PAGE 2 - Terms + Signature
  doc.addPage();
  addHeader(doc);
  y = 155;

  y = addAccessScheduling(doc, y);
  y = addPaymentTerms(doc, y, 60);
  y += 10;
  addSignatureBlock(doc, y);
  addFooter(doc);

  doc.end();
  console.log("Generated: sample-proposal-dust-swabs.pdf");
}

// ============================================================
// 3. ASBESTOS TESTING PROPOSAL
// ============================================================
function generateAsbestosProposal() {
  const doc = createDoc();
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, "sample-proposal-asbestos.pdf")));

  // PAGE 1
  addHeader(doc);
  drawProposalNumber(doc, "{{proposal_num}}");
  let y = drawInfoBox(doc, {
    client: "{{client_company}}",
    date: "{{date}}",
    address: "{{building_address}}",
    units: "{{num_units}}",
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
    { cells: [{ text: "Site Visit by certified\nAsbestos inspector", size: 9 }, { text: "1" }, { text: "{{site_visit_rate}}" }, { text: "{{site_visit_total}}" }], height: 35 },
    { cells: [{ text: "Asbestos Surface Wipe\nSampling:\n(24 Hour Turn Around Time)", size: 9 }, { text: "{{num_samples}}" }, { text: "{{sample_rate}}" }, { text: "{{samples_total}}" }], height: 42 },
    { cells: [{ text: "New York State Tax\n8.8%", bold: true }, { text: "" }, { text: "" }, { text: "{{tax}}" }], height: 30 },
    { cells: [{ text: "TOTAL", bold: true }, { text: "" }, { text: "" }, { text: "{{total}}", bold: true }], height: 28 },
  ], colW);

  y += 15;
  doc.font("Helvetica").fontSize(9).fillColor("#000000");
  doc.text("The number of samples listed herein is an ", LEFT, y, { width: CONTENT_WIDTH, continued: true });
  doc.font("Helvetica-Bold").text("estimate only. ", { continued: true });
  doc.font("Helvetica").text("The final invoice shall be adjusted to reflect the ", { continued: true });
  doc.font("Helvetica-Bold").text("actual number of samples collected and analyzed ", { continued: true });
  doc.font("Helvetica").text("during the course of the work.");

  addFooter(doc);

  // PAGE 2 - Terms + Signature
  doc.addPage();
  addHeader(doc);
  y = 155;

  y = addAccessScheduling(doc, y);
  y = addPaymentTerms(doc, y, 14);
  y += 10;
  addSignatureBlock(doc, y);
  addFooter(doc);

  doc.end();
  console.log("Generated: sample-proposal-asbestos.pdf");
}

generateXRFProposal();
generateDustSwabsProposal();
generateAsbestosProposal();
