import QRCode from 'qrcode';

type QrSheetInput = {
  value: string;
  qrToken: string;
  stationName: string;
  chargerLabel: string;
  details: string; // e.g. "TYPE2 · 7 kW · LKR 70 / kWh"
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The QR as SVG markup, sharp at any print size.
export function qrSvg(value: string): Promise<string> {
  return QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#FFFFFF' } });
}

// A single A4 sign to print and fix at the charger: who it is for, the big QR, and how to use it.
export async function buildQrSheetHtml(input: QrSheetInput): Promise<string> {
  const svg = await qrSvg(input.value);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.stationName)} - ${escapeHtml(input.chargerLabel)} QR</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #17211B; background: #FFFFFF; }
  .sheet { max-width: 180mm; margin: 0 auto; border: 2px solid #15803D; border-radius: 18px; padding: 12mm 12mm 10mm; text-align: center; }
  .brand { font-size: 22pt; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
  .brand span { color: #15803D; }
  .tag { margin: 2mm 0 0; font-size: 10pt; letter-spacing: 2px; color: #46574B; text-transform: uppercase; }
  .cta { margin: 9mm 0 1mm; font-size: 24pt; font-weight: 700; }
  .sub { margin: 0; font-size: 12pt; color: #46574B; }
  .qr { width: 110mm; height: 110mm; margin: 8mm auto 6mm; padding: 4mm; border: 1px solid #CBDCCF; border-radius: 12px; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .charger { font-size: 30pt; font-weight: 800; margin: 0; }
  .station { font-size: 14pt; margin: 1mm 0 0; }
  .details { font-size: 11pt; color: #46574B; margin: 2mm 0 0; }
  .steps { display: flex; gap: 4mm; margin: 8mm 0 0; text-align: left; }
  .step { flex: 1; background: #F4FAF5; border-radius: 10px; padding: 3mm 4mm; font-size: 10.5pt; line-height: 1.35; }
  .step b { display: block; color: #15803D; font-size: 12pt; margin-bottom: 1mm; }
  .ref { margin: 7mm 0 0; font-size: 9pt; color: #6B7A70; }
</style>
</head>
<body>
  <div class="sheet">
    <p class="brand">Green<span>Charge</span></p>
    <p class="tag">Find. Charge. Go green.</p>
    <p class="cta">Scan to start charging</p>
    <p class="sub">Open the GreenCharge app and tap Scan</p>
    <div class="qr">${svg}</div>
    <p class="charger">${escapeHtml(input.chargerLabel)}</p>
    <p class="station">${escapeHtml(input.stationName)}</p>
    <p class="details">${escapeHtml(input.details)}</p>
    <div class="steps">
      <div class="step"><b>1. Plug in</b>Connect the cable to your car.</div>
      <div class="step"><b>2. Scan</b>Scan this code in the GreenCharge app.</div>
      <div class="step"><b>3. Charge</b>Set your limit and start. Pay only for what you use.</div>
    </div>
    <p class="ref">Charger reference: ${escapeHtml(input.qrToken)}</p>
  </div>
</body>
</html>`;
}
