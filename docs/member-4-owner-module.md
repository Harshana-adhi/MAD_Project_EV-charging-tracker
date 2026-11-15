# Member 4 — Station Owner Module

This document describes the owner features in this repository and their integration points. It contains environment variable names only; keep credentials in local ignored `.env` files.

## Implemented owner API

All routes are mounted under `/api/v1/owner` and require an authenticated owner role. The service enforces station, charger, session, wallet, and withdrawal ownership on the server.

The existing team-facing `GET /owner/stations/:id` detail route and nested `PATCH /owner/stations/:id/chargers/:chargerId` route remain as compatible aliases; both use the same ownership and validation rules as the canonical list endpoints below.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/owner/stations` | List owned stations, chargers, reviews and summary values |
| POST | `/owner/stations` | Create a pending station and notify its owner and administrators |
| PATCH | `/owner/stations/:id` | Update an owned station; rejected stations resubmit as pending |
| POST | `/owner/stations/:id/photos` | Upload a photo and enforce the three-photo limit |
| POST | `/owner/stations/:id/chargers` | Add an available charger and a 12-character QR token |
| PATCH | `/owner/chargers/:id` | Update allowed charger details |
| DELETE | `/owner/chargers/:id` | Delete only non-busy chargers without session history |
| PATCH | `/owner/chargers/:id/status` | Set an owned charger available/offline and broadcast its status |
| GET | `/owner/sessions` | List at most 100 newest sessions at owned stations |
| POST | `/owner/sessions/:id/dispute` | Dispute an eligible completed session within 24 hours |
| GET | `/owner/earnings?from=&to=` | Read ledger earnings and session commission by Colombo day |
| GET | `/owner/withdrawals` | List the owner’s withdrawal requests |
| POST | `/owner/withdrawals` | Place an atomic withdrawal request and hold credits |

Successful responses use `{ data: ... }`. Error responses use the shared `{ error: { code, message } }` format. Station photos are uploaded to Cloudinary before the short Prisma transaction; a database row lock enforces the maximum photo count under concurrent requests. Cleanup uses the upload result’s Cloudinary `public_id`; if database state cannot be verified, the service leaves the asset in place rather than risking deletion of a referenced photo.

Charging-session creation and completion remain in Member 5’s module. Member 4’s charger operations lock the charger row, matching Member 5’s session locks. Session disputes do not adjust credit balances. Withdrawal creation calls the shared `credit.hold` service within `withTx`; wallet values and ledger rows are never edited directly by this module.

## Owner mobile screens

- `/(owner)/dashboard`: wallet balance, today’s earnings, active session records, station/charger counts and availability controls.
- `/(owner)/stations`: owned station statuses, summaries and add-station navigation.
- `/owner/station/new`: station fields, amenities, Leaflet/OpenStreetMap pin selection, Nominatim search on user action, and processed photo uploads.
- `/owner/station/[id]`: station editing and charger create/edit/delete/status controls.
- `/owner/charger/[id]/qr`: black QR on white with `evcharge://charge/<qrToken>` and sharing.
- `/(owner)/earnings`: 7/30-day ledger earnings, commission, counts, chart and daily detail.
- `/owner/sessions`: session filters and 24-hour dispute action.
- `/owner/wallet`: shared wallet values, withdrawal request validation and withdrawal history.

The owner API module supplies matching real and mock APIs through `EXPO_PUBLIC_USE_MOCKS`. Wallet display reuses `@/features/wallet`; the owner module only submits withdrawal requests and refreshes that shared query.

## Local setup

Backend environment variable names used by the project:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `PORT`
- `NODE_ENV`

Mobile environment variable names:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_USE_MOCKS`

Create private local `.env` files from the example files and provide values through the project’s approved development setup. Do not place backend secrets in `mobile/.env`; `EXPO_PUBLIC_*` values are bundled into the app. Mocks allow screen work without a backend or external services. Cloudinary, email, and database integrations require locally configured development accounts for full runtime testing.

## Local verification

From `backend/`:

```powershell
npm.cmd run build
npx.cmd --no-install tsx --test src/modules/owner/owner.schema.test.ts
```

From `mobile/`:

```powershell
npx.cmd --no-install tsc --noEmit
```

Do not run migrations or use a shared/production database for routine owner UI checks. Use Postman’s `backend/postman/owner.postman_collection.json` against an explicitly configured local development backend. Its state-changing examples require an owner token and intentionally are not run automatically.

## Android checklist

1. Start Expo from `mobile/` with `npx.cmd expo start`; select an Android emulator or open the project in Expo Go on a development phone.
2. Set `EXPO_PUBLIC_USE_MOCKS=true` for offline UI checks. Verify all eight screens, validation messages, loading/error/empty/refresh states, light/dark modes, chart labels, QR readability/share text, and navigation.
3. Verify pin dragging and button-triggered searches on a connected device. Location lookup needs internet access and should be invoked only after the owner taps search.
4. For an authorized local backend test, set `EXPO_PUBLIC_USE_MOCKS=false` and `EXPO_PUBLIC_API_URL` to the reachable development API. Exercise station ownership, photo limits, charger status, session disputes, ledger earnings, and withdrawal hold behavior with test accounts and test data only.
5. Confirm two-client session/status serialization and Cloudinary orphan cleanup with controlled development test doubles or an approved test environment. Do not use production accounts or services for acceptance checks.
6. Capture Android light and dark screenshots for review. Emulator/phone tests are not implied by TypeScript checks.

## Team dependencies

- Member 1: authentication, database helpers, credit ledger and wallet API, theme, components, socket client.
- Member 2: station approval/rejection and withdrawal processing.
- Member 3: notification display and related customer features.
- Member 5: QR lookup, charging session lifecycle, charger busy/available transitions and session events.

Do not edit these shared implementations from the Member 4 module. Report any integration change needed in another member’s files for approval before editing it.
