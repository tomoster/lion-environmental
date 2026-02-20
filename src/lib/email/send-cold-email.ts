import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

type SendColdEmailParams = {
  to: string;
  subject: string;
  body: string;
  senderName: string;
};

export async function sendColdEmail({
  to,
  subject,
  body,
  senderName,
}: SendColdEmailParams) {
  const info = await transporter.sendMail({
    from: `${senderName} <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text: body,
  });

  return { messageId: info.messageId };
}
