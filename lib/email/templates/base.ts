/**
 * lib/email/templates/base.ts
 *
 * Base responsive HTML email template with dark luxury styling,
 * consistent header logo, typography, and footer.
 */

export type BaseEmailOptions = {
  title: string;
  preheader?: string;
  bodyContentHtml: string;
  customerEmail?: string;
};

export function renderBaseEmailTemplate({
  title,
  preheader,
  bodyContentHtml,
}: BaseEmailOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0A0A18;
      color: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    table { border-collapse: collapse; }
    .gold-text { color: #C9A84C; }
    .muted { color: #94A3B8; }
    .card {
      background: #121226;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 28px;
    }
    .btn-gold {
      background: linear-gradient(135deg, #C9A84C 0%, #E6C667 100%);
      color: #0A0A18 !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      display: inline-block;
    }
  </style>
</head>
<body style="background-color: #0A0A18; margin: 0; padding: 24px 12px;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#0A0A18;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ""}
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" align="center" style="max-width: 600px; margin: 0 auto;">
    <!-- HEADER -->
    <tr>
      <td style="padding: 20px 0; text-align: center;">
        <span style="font-size: 24px; color: #C9A84C; font-weight: 700;">✦ CURATED FINDS</span>
        <div style="font-size: 11px; letter-spacing: 2px; color: #94A3B8; text-transform: uppercase; margin-top: 4px;">Exclusive E-Commerce Collection</div>
      </td>
    </tr>

    <!-- MAIN BODY CONTAINER -->
    <tr>
      <td>
        <div class="card">
          ${bodyContentHtml}
        </div>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="padding: 24px 0; text-align: center; font-size: 12px; color: #64748B;">
        <p style="margin: 0 0 8px;">© ${new Date().getFullYear()} Curated Finds. All rights reserved.</p>
        <p style="margin: 0;">
          You are receiving this email regarding your account activity. 
          <a href="#" style="color: #94A3B8; text-decoration: underline;">Notification Preferences</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
