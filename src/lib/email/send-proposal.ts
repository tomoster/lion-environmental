import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

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
  subjectTemplate?: string;
  bodyTemplate?: string;
};

const DEFAULT_SUBJECT = "Proposal \u2014 {{address}}";

const DEFAULT_BODY = `Hi,

Thank you for reaching out. Please find attached our proposal for {{address}}.

Once you've had a chance to review, let us know a good time to schedule the work. We're looking forward to working with you!`;

function interpolate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function sendProposalEmail({
  to,
  jobNumber,
  clientCompany,
  buildingAddress,
  attachments,
  senderName,
  subjectTemplate,
  bodyTemplate,
}: SendProposalParams) {
  const vars: Record<string, string> = {
    address: buildingAddress || `Job #${jobNumber}`,
    job_number: String(jobNumber),
    company: clientCompany,
  };

  const subject = interpolate(subjectTemplate || DEFAULT_SUBJECT, vars);
  const bodyText = interpolate(bodyTemplate || DEFAULT_BODY, vars);

  const bodyHtml = bodyText
    .split("\n\n")
    .map((p) => `<p style="color: #555;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");

  const info = await transporter.sendMail({
    from: `${senderName} <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${bodyHtml}
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
