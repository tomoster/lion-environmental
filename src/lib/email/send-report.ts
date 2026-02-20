import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

type SendReportParams = {
  to: string;
  jobNumber: number;
  clientCompany: string;
  buildingAddress: string;
  serviceType: "xrf" | "dust_swab" | "asbestos";
  pdfBuffer: Buffer;
  filename: string;
  senderName: string;
};

const SERVICE_LABELS: Record<string, string> = {
  xrf: "Lead Paint Testing (XRF)",
  dust_swab: "Dust Wipe Sampling",
  asbestos: "Asbestos Testing",
};

export async function sendReportEmail({
  to,
  jobNumber,
  clientCompany,
  buildingAddress,
  serviceType,
  pdfBuffer,
  filename,
  senderName,
}: SendReportParams) {
  const serviceLabel = SERVICE_LABELS[serviceType] ?? "Inspection";

  const info = await transporter.sendMail({
    from: `${senderName} <${process.env.GMAIL_USER}>`,
    to,
    subject: `${serviceLabel} Report — ${buildingAddress || `Job #${jobNumber}`}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${serviceLabel} Report</h2>
        <p>Dear ${clientCompany},</p>
        <p>Please find attached the ${serviceLabel.toLowerCase()} report for the property at <b>${buildingAddress}</b>.</p>
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
        <p>If you have any questions about this report, please don't hesitate to reach out.</p>
        <p>Thank you for choosing Lion Environmental!</p>
        <p style="color: #666; margin-top: 20px;">
          Best regards,<br/>
          ${senderName}<br/>
          Lion Environmental LLC<br/>
          (201) 375-2797<br/>
          lionenvironmentalllc@gmail.com
        </p>
      </div>
    `,
    attachments: [
      {
        filename,
        content: pdfBuffer,
      },
    ],
  });

  return { id: info.messageId };
}
