import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const SERVICE_LABELS: Record<string, string> = {
  xrf: "Lead Paint Testing (XRF)",
  dust_swab: "Dust Wipe Sampling",
  asbestos: "Asbestos Testing",
};

type ProposalAttachment = {
  buffer: Buffer;
  filename: string;
  type: string;
};

type SendProposalParams = {
  to: string;
  jobNumber: number;
  clientCompany: string;
  buildingAddress: string;
  attachments: ProposalAttachment[];
  senderName: string;
};

export async function sendProposalEmail({
  to,
  jobNumber,
  clientCompany,
  buildingAddress,
  attachments,
  senderName,
}: SendProposalParams) {
  const serviceList = attachments
    .map((a) => SERVICE_LABELS[a.type] ?? a.type)
    .join(", ");

  const subject = `Proposal \u2014 ${buildingAddress || `Job #${jobNumber}`}`;

  const info = await transporter.sendMail({
    from: `${senderName} <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p style="color: #333;">Hi,</p>
        <p style="color: #555;">
          Thank you for reaching out. Please find attached our proposal${attachments.length > 1 ? "s" : ""} for <strong>${buildingAddress || `Job #${jobNumber}`}</strong>.
        </p>
        <p style="color: #555;">
          Once you've had a chance to review, let us know a good time to schedule the work. We're looking forward to working with you!
        </p>
        <p style="color: #666; margin-top: 20px;">
          Best,<br/>
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
