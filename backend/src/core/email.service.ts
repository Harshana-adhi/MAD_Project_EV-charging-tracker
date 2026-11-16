import { Resend } from 'resend';
import { config } from '../config';

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

// Hosted copy of the full GreenCharge lockup (mark + wordmark + tagline), used in email
// headers – email clients can't load local project files, so this needs a public URL.
const LOGO_URL =
  'https://res.cloudinary.com/zifdme0u/image/upload/v1794804852/branding/greencharge-email-lockup.png';

type EmailAttachment = {
  filename: string;
  content: Buffer;
  // When set, the file is shown inside the email (referenced as cid:<contentId>) instead of attached.
  contentId?: string;
  contentType?: string;
};

type EmailInput = {
  to: string;
  subject: string;
  heading: string;
  message: string;
  // An inline image shown under the message, e.g. a charger's QR code.
  image?: { contentId: string; alt: string; caption?: string };
  attachments?: EmailAttachment[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildImage(image: EmailInput['image']): string {
  if (!image) return '';
  const caption = image.caption
    ? `<p style="margin:8px 0 0;font-size:13px;line-height:18px;color:#46574B;">${escapeHtml(image.caption)}</p>`
    : '';
  return `<div style="margin:8px 0 4px;text-align:center;">
            <img src="cid:${image.contentId}" width="260" height="260" alt="${escapeHtml(image.alt)}" style="display:inline-block;border:1px solid #CBDCCF;border-radius:12px;">
            ${caption}
          </div>`;
}

function buildHtml(heading: string, message: string, image?: EmailInput['image']): string {
  const paragraphs = message
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => `<p style="margin:0 0 12px;font-size:15px;line-height:22px;color:#17211B;">${escapeHtml(line)}</p>`)
    .join('');

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px 12px;background:#F4FAF5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #CBDCCF;">
      <tr>
        <td style="background:#FFFFFF;padding:20px 24px;border-bottom:1px solid #CBDCCF;">
          <img src="${LOGO_URL}" width="240" height="70" alt="GreenCharge – Find. Charge. Go green." style="display:block;">
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#14532D;">${escapeHtml(heading)}</h1>
          ${paragraphs}
          ${buildImage(image)}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;background:#F4FAF5;font-size:12px;color:#46574B;">
          You received this email because you have a GreenCharge account.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendEmail(input: EmailInput): Promise<void> {
  if (!resend) {
    if (config.nodeEnv !== 'production') {
      console.log(`[email not sent – RESEND_API_KEY missing] ${input.subject} -> ${input.to}`);
    }
    return;
  }

  const { error } = await resend.emails.send({
    from: config.emailFrom,
    to: input.to,
    subject: input.subject,
    html: buildHtml(input.heading, input.message, input.image),
    text: `${input.heading}\n\n${input.message}\n\nGreenCharge`,
    attachments: input.attachments,
  });

  if (error) console.error(`Email to ${input.to} failed: ${error.message}`);
}

// Emails must never break the request that triggered them.
export function sendEmailInBackground(input: EmailInput): void {
  sendEmail(input).catch((err) => console.error('Email error:', err));
}
