export function renderSignature(senderName: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px; border-top: 2px solid #2563eb; padding-top: 16px; font-family: Arial, sans-serif;">
      <tr>
        <td style="padding: 0;">
          <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: 700; color: #1a1a1a;">
            ${senderName}
          </p>
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #2563eb; font-weight: 600; letter-spacing: 0.3px;">
            LION ENVIRONMENTAL LLC
          </p>
          <table cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #555;">
            <tr>
              <td style="padding: 2px 0;">
                <span style="color: #2563eb; font-weight: 600;">P:</span>&nbsp;
                <a href="tel:+12013752797" style="color: #555; text-decoration: none;">(201) 375-2797</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 2px 0;">
                <span style="color: #2563eb; font-weight: 600;">E:</span>&nbsp;
                <a href="mailto:lionenvironmentalllc@gmail.com" style="color: #555; text-decoration: none;">lionenvironmentalllc@gmail.com</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}
