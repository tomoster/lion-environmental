import { Resend } from "resend";

type SendReportParams = {
  to: string;
  jobNumber: number;
  clientCompany: string;
  buildingAddress: string;
  serviceType: string;
  pdfBuffer: Buffer;
  filename: string;
  senderName: string;
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
  const resend = new Resend(process.env.RESEND_API_KEY);
  const serviceLabel =
    serviceType === "lpt"
      ? "Lead Paint Testing (XRF)"
      : serviceType === "dust_swab"
      ? "Dust Wipe Sampling"
      : "Inspection";

  const { data, error } = await resend.emails.send({
    from: `${senderName} <reports@lionenvironmental.com>`,
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

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
