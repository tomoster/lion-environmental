import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendInvoiceParams = {
  to: string;
  invoiceNumber: number;
  clientCompany: string;
  total: number;
  dueDate: string;
  pdfBuffer: Buffer;
  senderName: string;
};

export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  clientCompany,
  total,
  dueDate,
  pdfBuffer,
  senderName,
}: SendInvoiceParams) {
  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(total);

  const formattedDue = new Date(dueDate + "T00:00:00").toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" }
  );

  const { data, error } = await resend.emails.send({
    from: `${senderName} <invoices@lionenvironmental.com>`,
    to,
    subject: `Invoice #${invoiceNumber} from Lion Environmental LLC`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Invoice #${invoiceNumber}</h2>
        <p>Dear ${clientCompany},</p>
        <p>Please find attached your invoice from Lion Environmental LLC.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Invoice Number:</td>
            <td style="padding: 8px 0; font-weight: bold;">#${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Amount Due:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formattedTotal}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Due Date:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formattedDue}</td>
          </tr>
        </table>
        <p><strong>Payment Options:</strong></p>
        <ul style="color: #555;">
          <li>Zelle: 2013752797</li>
          <li>Check payable to: Lion Environmental LLC</li>
          <li>Mail to: 1500 Teaneck Rd #448, Teaneck, NJ 07666</li>
        </ul>
        <p>If you have any questions, please don't hesitate to reach out.</p>
        <p>Thank you for your business!</p>
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
        filename: `invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
