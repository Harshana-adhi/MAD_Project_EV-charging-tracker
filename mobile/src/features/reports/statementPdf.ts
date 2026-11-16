import type { SessionWithNames } from '@/types/domain';
import { periodLabel } from './labels';
import type { OwnerStatement } from './types';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const money = (amount: number) =>
  `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const colomboMonth = (iso: string) =>
  new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 7);

const colomboDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Asia/Colombo',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

// The owner's finished sessions in the statement's month, oldest first.
export function sessionsForMonth(sessions: SessionWithNames[], month: string): SessionWithNames[] {
  return sessions
    .filter((session) => session.status !== 'active' && session.status !== 'cancelled')
    .filter((session) => colomboMonth(session.startedAt) === month)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

// A printable monthly statement: summary, earnings per station, and every session in the month.
export function buildStatementHtml(statement: OwnerStatement, sessions: SessionWithNames[]): string {
  const monthName = periodLabel(statement.month);
  const generated = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' });

  const byStation = new Map<string, { sessions: number; kwh: number; charged: number; earned: number }>();
  for (const session of sessions) {
    const entry = byStation.get(session.stationName) ?? { sessions: 0, kwh: 0, charged: 0, earned: 0 };
    entry.sessions += 1;
    entry.kwh += session.kwh ?? 0;
    entry.charged += session.cost ?? 0;
    entry.earned += (session.cost ?? 0) - (session.commission ?? 0);
    byStation.set(session.stationName, entry);
  }
  const stationRows = [...byStation.entries()]
    .sort((a, b) => b[1].earned - a[1].earned)
    .map(
      ([name, s]) => `<tr><td>${escapeHtml(name)}</td><td class="n">${s.sessions}</td><td class="n">${s.kwh.toFixed(2)}</td>
        <td class="n">${money(s.charged)}</td><td class="n">${money(s.earned)}</td></tr>`,
    )
    .join('');

  const sessionRows = sessions
    .map((session) => {
      const earned = (session.cost ?? 0) - (session.commission ?? 0);
      return `<tr><td>${colomboDateTime(session.startedAt)}</td><td>${escapeHtml(session.stationName)} · ${escapeHtml(session.chargerLabel)}</td>
        <td>${escapeHtml(session.customerName)}</td><td class="n">${(session.kwh ?? 0).toFixed(2)}</td>
        <td class="n">${money(session.cost ?? 0)}</td><td class="n">${money(session.commission ?? 0)}</td><td class="n">${money(earned)}</td>
        <td>${session.status === 'disputed' ? 'Disputed' : 'Completed'}</td></tr>`;
    })
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GreenCharge statement ${escapeHtml(monthName)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #17211B; margin: 0; font-size: 10.5pt; }
  .top { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #15803D; padding-bottom: 4mm; }
  .brand { font-size: 20pt; font-weight: 800; margin: 0; }
  .brand span { color: #15803D; }
  .meta { text-align: right; color: #46574B; font-size: 9.5pt; line-height: 1.5; }
  h1 { font-size: 15pt; margin: 6mm 0 1mm; }
  .sub { color: #46574B; margin: 0 0 5mm; }
  .cards { display: flex; gap: 3mm; margin-bottom: 5mm; }
  .card { flex: 1; background: #F4FAF5; border-radius: 8px; padding: 3mm 4mm; }
  .card .k { color: #46574B; font-size: 9pt; }
  .card .v { font-size: 13pt; font-weight: 700; margin-top: 1mm; }
  .card.earned { background: #15803D; color: #fff; }
  .card.earned .k { color: #DCFCE7; }
  h2 { font-size: 12pt; margin: 6mm 0 2mm; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9pt; color: #46574B; border-bottom: 1px solid #CBDCCF; padding: 2mm 1.5mm; }
  td { border-bottom: 1px solid #EEF3EF; padding: 1.8mm 1.5mm; vertical-align: top; }
  .n { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  th.n { text-align: right; }
  .sum td { font-weight: 700; border-top: 1px solid #CBDCCF; }
  .empty { color: #6B7A70; padding: 3mm 0; }
  .note { margin-top: 6mm; color: #6B7A70; font-size: 8.5pt; line-height: 1.5; }
</style>
</head>
<body>
  <div class="top">
    <p class="brand">Green<span>Charge</span></p>
    <div class="meta">Owner statement<br>${escapeHtml(statement.ownerName)}<br>Generated ${escapeHtml(generated)}</div>
  </div>

  <h1>${escapeHtml(monthName)}</h1>
  <p class="sub">What customers paid at your chargers this month, the platform's commission, and what you earned.</p>

  <div class="cards">
    <div class="card earned"><div class="k">You earned</div><div class="v">${money(statement.earned)}</div></div>
    <div class="card"><div class="k">Customer charges</div><div class="v">${money(statement.charged)}</div></div>
    <div class="card"><div class="k">Platform commission (5%)</div><div class="v">−${money(statement.commission)}</div></div>
  </div>
  <div class="cards">
    <div class="card"><div class="k">Sessions</div><div class="v">${statement.sessions}</div></div>
    <div class="card"><div class="k">Energy delivered</div><div class="v">${statement.kwh.toFixed(2)} kWh</div></div>
    <div class="card"><div class="k">Withdrawals paid</div><div class="v">${money(statement.withdrawalsPaid)}</div></div>
  </div>

  <h2>By station</h2>
  ${
    stationRows
      ? `<table><tr><th>Station</th><th class="n">Sessions</th><th class="n">kWh</th><th class="n">Charged</th><th class="n">You earned</th></tr>${stationRows}</table>`
      : '<p class="empty">No charging sessions this month.</p>'
  }

  <h2>Sessions</h2>
  ${
    sessionRows
      ? `<table><tr><th>Started</th><th>Station · charger</th><th>Customer</th><th class="n">kWh</th><th class="n">Charged</th><th class="n">Commission</th><th class="n">You earned</th><th>Status</th></tr>${sessionRows}
        <tr class="sum"><td colspan="3">Total</td><td class="n">${statement.kwh.toFixed(2)}</td><td class="n">${money(statement.charged)}</td><td class="n">${money(statement.commission)}</td><td class="n">${money(statement.earned)}</td><td></td></tr></table>`
      : '<p class="empty">No charging sessions this month.</p>'
  }

  <p class="note">Amounts are in Sri Lankan rupees (LKR). Commission is 5% of each completed session. Disputed sessions are included until resolved. Times are Sri Lanka time.</p>
</body>
</html>`;
}
