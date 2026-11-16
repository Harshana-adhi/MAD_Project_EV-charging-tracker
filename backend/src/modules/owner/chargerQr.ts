import QRCode from 'qrcode';
import { prisma } from '../../core/db';
import { AppError } from '../../core/errors';
import { sendEmail } from '../../core/email.service';

// Must match chargerQrValue in mobile/src/features/owner/api.ts – the app's scanner reads this.
export function chargerQrValue(qrToken: string): string {
  return `evcharge://charge/${qrToken}`;
}

// A crisp, print-sized PNG of a charger's QR code.
export function chargerQrPng(qrToken: string): Promise<Buffer> {
  return QRCode.toBuffer(chargerQrValue(qrToken), {
    type: 'png',
    width: 900,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

const safeFilePart = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'charger';

// Emails the owner their charger's QR code: shown in the email and attached as a PNG to print.
// Returns the address it was sent to.
export async function emailChargerQr(chargerId: string, ownerId: string): Promise<string> {
  const charger = await prisma.charger.findUnique({
    where: { id: chargerId },
    include: { station: { select: { name: true, ownerId: true, owner: { select: { email: true, fullName: true } } } } },
  });
  if (!charger || charger.station.ownerId !== ownerId) throw new AppError('NOT_FOUND', 404);

  const png = await chargerQrPng(charger.qrToken);
  const stationName = charger.station.name;
  const filename = `GreenCharge-${safeFilePart(stationName)}-${safeFilePart(charger.label)}-QR.png`;
  const to = charger.station.owner.email;

  await sendEmail({
    to,
    subject: `Your QR code for ${charger.label} at ${stationName}`,
    heading: `QR code for ${charger.label}`,
    message: [
      `Hi ${charger.station.owner.fullName},`,
      `Here is the QR code for charger ${charger.label} at ${stationName}. Customers scan it in the GreenCharge app to start charging.`,
      'Print it and fix it on or next to the charger, at eye level, where nothing covers it. The same image is attached as a PNG file, so you can download and print it.',
      'You can print it again any time from the charger in the app: My stations, then the charger, then QR code.',
      `QR reference: ${charger.qrToken}`,
    ].join('\n'),
    image: { contentId: 'charger-qr', alt: `QR code for ${charger.label}`, caption: `${stationName} · ${charger.label}` },
    attachments: [
      { filename: 'charger-qr.png', content: png, contentId: 'charger-qr' },
      { filename, content: png },
    ],
  });
  return to;
}

// Charger creation must never fail because an email couldn't be sent.
export function emailChargerQrInBackground(chargerId: string, ownerId: string): void {
  emailChargerQr(chargerId, ownerId).catch((err) => console.error('Charger QR email error:', err));
}
