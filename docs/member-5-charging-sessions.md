# Charging session flow

The charging session module lets a customer identify a charger, reserve a spending limit, view a simulated charging meter, and settle or cancel the session. It also supplies receipts and charging history. It uses the shared authentication, credit, notification, socket, and database services; the module does not write wallet balances or ledger entries directly.

## Customer flow

1. The customer scans a QR value in the form `evcharge://charge/<qrToken>` or enters the printed token. The app validates the token shape and calls `GET /sessions/charger/:qrToken` to show the approved station, charger, rate, power, status, and available credits.
2. The customer chooses a spending limit from 500, 1,000, or 2,000 credits, or enters a custom amount between 100 and 20,000 credits. The screen estimates the energy and simulated charging time. If available credits are lower than the limit, it offers a top-up for the shortfall rounded up to the next 100 credits.
3. `POST /sessions/start` creates an active session, calls `credit.hold` for the full limit, and marks the charger busy in one database transaction. A charger status event updates other users' maps after the transaction commits.
4. The live screen calculates energy from charger power and time since `startedAt`. The simulation runs at 60 times real time, so one real second represents one simulated minute. The meter shows energy, running cost, simulated time, and progress toward the limit. The customer can cancel only while the displayed energy is below 0.05 kWh. The session continues while the app is closed; the Sessions tab provides a resume link.
5. When the customer stops, or the limit is reached, `POST /sessions/:id/end` calculates `min(kWh × rate, spending limit)`, rounds to two decimals, and calls `credit.settleSession` within a transaction. The credit service releases unused held credits and allocates the 5% platform commission. The session becomes completed and the charger becomes available. The customer sees the receipt and may open the separate review screen.
6. If the customer cancels at the start, `POST /sessions/:id/cancel` calls `credit.release` for the full limit, marks the session cancelled, and frees the charger in one transaction.

## Data and safety rules

- All seven session endpoints require an authenticated customer. Session detail, end, and cancel check that the caller owns the session.
- Starting a session locks both the customer and charger rows before checking for an existing active session or a busy charger. This prevents concurrent starts from creating two active sessions for one customer or charger.
- Ending and cancelling lock the session row and recheck its active status. A repeated request returns `SESSION_NOT_ACTIVE` before any credit movement.
- The `withTx` boundary covers session state, charger state, and credit changes. Socket events, wallet updates, and notifications are sent only after commit.
- Session reads return the fields in the shared `Session` and `SessionWithNames` types, with decimal amounts converted to numbers and timestamps to ISO strings.

## Screens and integration

The implemented routes are `/scan`, `/charge/[token]`, `/session/[id]`, `/receipt/[id]`, and `/(customer)/sessions`. The screens use the shared theme, components, formatting helpers, Axios client, TanStack Query, and socket event listener. The `features/session/api.mock.ts` module supplies the same function signatures as the real API for mock mode. The QR scanner uses `expo-camera` with manual entry when camera access is unavailable.

## Verification

Backend and mobile TypeScript checks pass with `npx tsc --noEmit`. Four focused logic tests pass: cost rounding and capping, input validation, QR parsing, and meter speed and cap. The Postman collection at `backend/postman/sessions.postman_collection.json` contains the normal lookup, start, read, end, and cancel sequence, plus validation, ownership, insufficient credit, and duplicate end checks. Live database, ledger, two-device socket, camera, and phone layout checks still require the team's Supabase credentials, seeded charger, authenticated test accounts, and an Android device. Those results should be recorded in the final group test report after execution; they are not claimed here.
