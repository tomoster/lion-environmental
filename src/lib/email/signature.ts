export type SignatureInfo = {
  senderName: string;
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
};

const DEFAULTS = {
  businessName: "Lion Environmental LLC",
  businessPhone: "(201) 375-2797",
  businessEmail: "lionenvironmentalllc@gmail.com",
};

export function renderSignature(info: string | SignatureInfo): string {
  const senderName = typeof info === "string" ? info : info.senderName;
  const businessName = (typeof info === "string" ? undefined : info.businessName) || DEFAULTS.businessName;
  const businessPhone = (typeof info === "string" ? undefined : info.businessPhone) || DEFAULTS.businessPhone;
  const businessEmail = (typeof info === "string" ? undefined : info.businessEmail) || DEFAULTS.businessEmail;
  const phoneDigits = businessPhone.replace(/\D/g, "");

  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px; border-top: 2px solid #2563eb; padding-top: 16px; font-family: Arial, sans-serif;">
      <tr>
        <td style="padding: 0;">
          <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: 700; color: #1a1a1a;">
            ${senderName}
          </p>
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #2563eb; font-weight: 600; letter-spacing: 0.3px;">
            ${businessName.toUpperCase()}
          </p>
          <table cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #555;">
            <tr>
              <td style="padding: 2px 0;">
                <span style="color: #2563eb; font-weight: 600;">P:</span>&nbsp;
                <a href="tel:+1${phoneDigits}" style="color: #555; text-decoration: none;">${businessPhone}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 2px 0;">
                <span style="color: #2563eb; font-weight: 600;">E:</span>&nbsp;
                <a href="mailto:${businessEmail}" style="color: #555; text-decoration: none;">${businessEmail}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}
