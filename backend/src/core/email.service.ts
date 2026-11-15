import { Resend } from 'resend';
import { config } from '../config';

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

type EmailInput = {
  to: string;
  subject: string;
  heading: string;
  message: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(heading: string, message: string): string {
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
        <td style="background:#15803D;padding:18px 24px;color:#FFFFFF;font-size:20px;font-weight:bold;">GreenCharge</td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#14532D;">${escapeHtml(heading)}</h1>
          ${paragraphs}
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
    html: buildHtml(input.heading, input.message),
    text: `${input.heading}\n\n${input.message}\n\nGreenCharge`,
  });

  if (error) console.error(`Email to ${input.to} failed: ${error.message}`);
}

// Emails must never break the request that triggered them.
export function sendEmailInBackground(input: EmailInput): void {
  sendEmail(input).catch((err) => console.error('Email error:', err));
}
