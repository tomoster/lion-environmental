export type SignatureInfo = {
  senderName: string;
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  signatureText?: string;
};

export function renderSignature(info: string | SignatureInfo): string {
  if (typeof info === "string") {
    return renderPlainText(info);
  }

  if (info.signatureText) {
    return renderPlainText(info.signatureText);
  }

  const lines = [info.senderName];
  if (info.businessName) lines.push(info.businessName);
  if (info.businessPhone) lines.push(info.businessPhone);
  if (info.businessEmail) lines.push(info.businessEmail);
  return renderPlainText(lines.join("\n"));
}

function renderPlainText(text: string): string {
  const html = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("<br>");

  return `<div style="margin-top: 24px; font-size: 14px; color: #000;">${html}</div>`;
}
