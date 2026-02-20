import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const DEFAULT_REPORT_SUBJECT = "{{service_type}} Report — {{address}}";

const DEFAULT_REPORT_BODY = `Dear {{company}},

Please find attached the {{service_type}} report for the property at {{address}}.

If you have any questions about this report, please don't hesitate to reach out.

Thank you for choosing Lion Environmental!`;

type ReportAttachment = {
  buffer: Buffer;
  filename: string;
};

type SendReportParams = {
  to: string;
  jobNumber: number;
  clientCompany: string;
  buildingAddress: string;
  serviceType: "xrf" | "dust_swab" | "asbestos";
  attachments: ReportAttachment[];
  senderName: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
};

const SERVICE_LABELS: Record<string, string> = {
  xrf: "Lead Paint Testing (XRF)",
  dust_swab: "Dust Wipe Sampling",
  asbestos: "Asbestos Testing",
};

function replaceVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function textToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((l) => l.trimStart().startsWith("- "))) {
        const items = lines
          .map((l) => `<li>${l.replace(/^\s*-\s*/, "")}</li>`)
          .join("");
        return `<ul style="color: #555;">${items}</ul>`;
      }
      return `<p>${block.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
}

export async function sendReportEmail({
  to,
  jobNumber,
  clientCompany,
  buildingAddress,
  serviceType,
  attachments,
  senderName,
  subjectTemplate,
  bodyTemplate,
}: SendReportParams) {
  const serviceLabel = SERVICE_LABELS[serviceType] ?? "Inspection";

  const vars: Record<string, string> = {
    job_number: String(jobNumber),
    company: clientCompany,
    address: buildingAddress || `Job #${jobNumber}`,
    service_type: serviceLabel,
  };

  const subject = replaceVars(
    subjectTemplate || DEFAULT_REPORT_SUBJECT,
    vars
  );
  const bodyHtml = textToHtml(
    replaceVars(bodyTemplate || DEFAULT_REPORT_BODY, vars)
  );

  const info = await transporter.sendMail({
    from: `${senderName} <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${serviceLabel} Report</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Job Number:</td>
            <td style="padding: 8px 0; font-weight: bold;">#${jobNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Service:</td>
            <td style="padding: 8px 0; font-weight: bold;">${serviceLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Property:</td>
            <td style="padding: 8px 0; font-weight: bold;">${buildingAddress}</td>
          </tr>
        </table>
        ${bodyHtml}
        <p style="color: #666; margin-top: 20px;">
          Best regards,<br/>
          ${senderName}<br/>
          Lion Environmental LLC<br/>
          (201) 375-2797<br/>
          lionenvironmentalllc@gmail.com
        </p>
      </div>
    `,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.buffer,
    })),
  });

  return { id: info.messageId };
}
