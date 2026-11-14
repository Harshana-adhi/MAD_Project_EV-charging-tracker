# AI_CONTEXT.md

Paste this whole file into your AI tool at the start of every new chat, followed by the prompt template in Section 13.5.

Contract version: v3.0. Only the Group Leader (Harshana) changes this file; any change is announced to the team with a new version number.

```
1. Project Overview
1.1 System Description
The EV Charging Point Tracker is a mobile application that connects electric-vehicle (EV) drivers with people and businesses that own charging points. Drivers find nearby compatible chargers on a live map, see whether they are free, and pay for charging with prepaid credits. Owners list their chargers, earn credits from every session, and withdraw their earnings. Administrators verify stations and approve manual payments.
1.2 Problem
EV adoption is growing, but drivers rely on word of mouth and phone calls to find out whether a charger exists, whether it fits their connector, and whether it is free right now. Small businesses and homeowners who install chargers have no simple way to advertise them or collect payment from strangers.
1.3 Objectives
Help drivers find nearby, compatible and available chargers quickly.
Let owners publish chargers on a public map and earn money from them.
Provide a cashless, traceable prepaid credit system (1 credit = LKR 1) with a 5% platform commission.
Keep the platform trustworthy through admin verification of stations and payments.
Build a complete, working system at zero cost using free tools only.
1.4 Scope
In scope
Out of scope (future work)
Android app (iOS-compatible code)
Customer, Station Owner and Admin roles
Live map with filters and availability
Station / charger registration with admin approval
Prepaid wallet: card (simulated) and bank-slip top-ups
QR-based charging sessions with a simulated meter
Earnings, 5% commission, withdrawals
Reviews, favourites, in-app notifications
Talking to real charger hardware (OCPP)
Real payment gateway and real money
Automatic bank payouts
In-app turn-by-turn navigation (handed to Google Maps / Waze)
Email verification and forgot-password emails
Push notifications outside the app
Multi-language support, app-store release
1.5 Target Users
User
Who they are
Main goal
Customer
EV driver
Find a free, compatible charger and pay easily
Station Owner
Hotel, restaurant, shop, fuel station or homeowner with a charger
List chargers and earn from them
Admin
Platform staff (a team member in the demo)
Keep stations and payments genuine
Guest
Not logged in
Browse the map before signing up
2. System Functionalities
These are all the functional areas of the system and who builds each one. You need to know all of them because your module talks to several others.
Functional area
What it does
Built by
Authentication & permissions
Register, login, JWT, stay logged in, role-based screens, server-side role and ownership checks
M1 (Leader)
Wallet & card top-up (credit engine)
Wallet balance / held / available, ledger, hold-settle-release logic, 5% commission, simulated card top-up
M1 (Leader)
Profile & vehicles
View / edit profile, manage vehicles
M2
Slip top-ups & transaction history
Upload bank-slip top-up, list my requests, full transaction history
M2
Admin panel
Dashboard counts, approve stations, approve slip top-ups, process withdrawals, manage users
M2
Map & discovery
Live map, filters, search, list by distance, station details, directions
M3
Reviews, favourites & notifications
Rate stations, save favourites, in-app notification list and badge
M3
Station owner
Stations, photos, chargers, QR codes, availability, owner sessions, disputes, earnings, withdrawals
M4
Charging sessions
Scan QR, start with spending limit, live meter, end / cancel, receipt, history
M5
2.1 How the Credit System Works
1 credit = LKR 1. Every user has one wallet with balance and held. Available = balance − held.
Every credit movement is a row in transactions (topup, hold, release, charge, earning, commission, withdrawal). Wallet numbers are only changed by the Leader's credit.service.ts.
Start session: the spending limit is moved into held (hold).
End session: cost = kWh × rate, capped at the limit. The customer is charged the cost from held; the owner receives 95% (earning); the platform wallet receives 5% (commission); the rest of the hold is released.
Withdrawal: the owner's amount is held; when the admin marks it paid, it leaves the wallet (withdrawal); if rejected, it is released.
Every money operation runs in one database transaction, so credits are never lost or duplicated.
2.2 Charging Session Flow (end to end)
Owner (M4) adds a station and charger; Admin (M2) approves it; it appears on the map (M3).
Customer tops up credits (M1 card / M2 slip).
Customer opens the station (M3) → Charge here → scanner (M5) reads evcharge://charge/<qrToken> from the owner's QR (M4).
Customer sets a spending limit and starts (M5); credits are held (M1 engine); charger becomes busy; all maps update (M3).
Live meter runs; customer stops; backend settles payment (M5 using M1 engine); charger becomes available; wallets update live (M1).
Receipt (M5) → Rate this station (M3); owner sees the session and earnings (M4); notifications appear (M3).
Owner requests a withdrawal (M4); admin marks it paid (M2).
3. System Requirements
3.1 User Roles and Permissions
Capability
Guest
Customer
Owner
Admin
Browse map and station details
Yes
Yes
Yes
Yes
Wallet, transaction history
–
Yes
Yes
Yes
Card and slip top-up
–
Yes
–
–
Vehicles, favourites, reviews
–
Yes
–
–
Charging sessions
–
Yes
–
–
Stations, chargers, QR, earnings, withdrawals
–
–
Own only
–
Approve stations, top-ups, withdrawals; manage users
–
–
–
Yes
Profile and notifications
–
Yes
Yes
Yes
Admin accounts are created only by the seed script (no public admin sign-up). Blocked users cannot call any authenticated endpoint (403 USER_BLOCKED).
3.2 Functional Requirements
Priority (MoSCoW): M Must – built first; S Should – after all M items work; C Could – only if time remains. Rows highlighted in yellow are yours.
ID
Requirement
Owner
Pri.
FR-01
Users can register with email, password, full name and a role (Customer or Station Owner).
M1 (Leader)
M
FR-02
Users can log in, log out and stay logged in using a JWT stored securely on the phone.
M1 (Leader)
M
FR-03
Each role sees only its own screens; the server rejects requests a role is not allowed to make.
M1 (Leader)
M
FR-04
Users can view and edit their profile (name, phone).
M2
M
FR-05
Customers can add, edit and delete vehicles with connector type and battery capacity.
M2
S
FR-06
The app shows approved stations on an interactive map with the user's current location.
M3
M
FR-07
Map markers show charger availability (available / busy / offline) and update in real time.
M3
M
FR-08
Users can filter stations by connector type, minimum power, maximum price and availability.
M3
M
FR-09
Users can search stations by name and switch to a list sorted by distance.
M3
S
FR-10
Users can view station details: photos, chargers, rates, opening hours, amenities and rating.
M3
M
FR-11
Users can open directions to a station in Google Maps or Waze.
M3
M
FR-12
Customers can save stations as favourites.
M3
C
FR-13
Owners can register a station by picking its location on a map and adding details and photos; it starts as pending.
M4
M
FR-14
Owners can add, edit and delete chargers (connector, power, rate per kWh).
M4
M
FR-15
Each charger has a unique QR code that owners can display and share.
M4
M
FR-16
Owners can mark a charger as available or offline.
M4
M
FR-17
Admins can approve or reject pending stations with a reason.
M2
M
FR-18
Users can view their wallet (balance, held, available) with live updates.
M1 (Leader)
M
FR-19
Customers can top up credits with a simulated card payment.
M1 (Leader)
M
FR-20
Customers can request a top-up by uploading a bank-transfer slip.
M2
S
FR-21
Admins can approve or reject slip top-ups; approval adds credits.
M2
S
FR-22
Users can view their transaction history with filters.
M2
M
FR-23
Customers can scan a charger QR code to open its session screen.
M5
M
FR-24
Customers can start a session with a spending limit, which is held from their balance.
M5
M
FR-25
During a session the app shows a live simulated meter (kWh, time, cost).
M5
M
FR-26
Ending a session settles payment atomically: charge customer, 95% to owner, 5% commission, release unused hold.
M5
M
FR-27
Customers can cancel an active session; the hold is released.
M5
S
FR-28
Customers see a receipt after each session and a charging history.
M5
M
FR-29
Owners can view sessions at their chargers and dispute one within 24 hours.
M4
S
FR-30
Owners can view an earnings dashboard with a daily chart and commission.
M4
M
FR-31
Owners can request a withdrawal of their available credits.
M4
M
FR-32
Admins can mark a withdrawal as paid or reject it (credits returned).
M2
M
FR-33
Customers can rate (1–5) and review a station after a completed session.
M3
S
FR-34
Admins can view users, block or unblock them, and reset a user's password.
M2
S
FR-35
Users see in-app notifications for key events (session completed, approvals, payouts).
M3
S
FR-36
Customers can enter battery % and see only stations within estimated range.
M3
C
3.3 Non-Functional Requirements
These apply to every member's code.
ID
Category
Requirement
NFR-01
Security
Every API route except public station browsing requires a valid JWT; role and ownership are checked on the server for every request.
NFR-02
Security
Passwords are hashed with bcrypt; secrets (database URL, JWT secret, Cloudinary keys) exist only in backend environment variables.
NFR-03
Data integrity
Credits change only through the credit service inside database transactions; balance and held can never be negative; balance always equals the sum of ledger entries.
NFR-04
Performance
Station list loads within 3 seconds on 4G (after the server is awake); screens respond to taps within 1 second.
NFR-05
Real-time
Charger status and wallet changes reach other open screens within about 2 seconds (Socket.io).
NFR-06
Usability
Material Design 3 via React Native Paper; touch targets at least 48 dp; starting a charge takes at most 3 taps after scanning.
NFR-07
Usability
Every screen has clear loading, empty and error states with friendly messages.
NFR-08
Reliability
Buttons that change money are disabled while a request runs (no double charges); network errors show a retry option.
NFR-09
Compatibility
Runs on Android phones supported by the project's Expo SDK; tested on at least two physical devices.
NFR-10
Privacy
Location is used only while the app is open; the app still works if location permission is denied.
NFR-11
Maintainability
TypeScript strict mode, one folder per module, the coding standards in Section 13, and the contracts in Section 9.
NFR-12
Cost
The whole system is developed, tested and demonstrated using free tiers only (Section 4.3).
3.4 User Stories and Acceptance Criteria
ID
User story
Acceptance criteria
Owner
US-01
As a new user, I want to register as a customer or an owner so that I can use the right features.
Registration with a used email shows 'Email already registered'; success logs me in and opens my role's home tab.
M1 (Leader)
US-02
As a user, I want to stay logged in so that I don't type my password every time.
Reopening the app goes straight to my home tab until I log out or the token expires.
M1 (Leader)
US-03
As a customer, I want to top up credits by card so that I can pay for charging.
Test card 4242… adds credits and the balance updates; test card 4000…0002 shows 'Card declined'.
M1 (Leader)
US-04
As a customer, I want to top up by bank slip so that I can pay without a card.
Request appears as 'Pending'; credits are added only after admin approval.
M2
US-05
As a user, I want to see every credit movement so that I can trust my balance.
History lists top-ups, holds, charges, releases, earnings and withdrawals, newest first.
M2
US-06
As an admin, I want to verify new stations so that fake listings never appear.
Pending list shows photos and location; approve makes it public; reject stores a reason; owner is notified.
M2
US-07
As a customer, I want to see chargers near me on a map so that I can find one quickly.
Map centres on my location (or Kandy if denied) and shows approved stations coloured by availability.
M3
US-08
As a customer, I want to filter by my connector type so that I only see usable chargers.
Applying TYPE2 hides stations without a TYPE2 charger.
M3
US-09
As a customer, I want live availability so that I don't drive to a busy charger.
When a session starts elsewhere the marker turns busy without refreshing.
M3
US-10
As a customer, I want to rate a station so that other drivers know what to expect.
Only after my own completed session, once per session.
M3
US-11
As an owner, I want to add my station so that drivers can find it.
Station shows 'Pending' to me and becomes public after approval.
M4
US-12
As an owner, I want a QR code per charger so that customers can start sessions easily.
QR opens full-screen with the code printed underneath and a Share button (shares the link as text).
M4
US-13
As an owner, I want to see my earnings and withdraw them so that I get paid.
Earnings chart matches ledger; withdrawal reduces available credits until the admin marks it paid.
M4
US-14
As a customer, I want to scan a QR and set a spending limit so that I never overspend.
Start is refused if available balance is below the limit; cost never exceeds the limit.
M5
US-15
As a customer, I want a receipt after charging so that I can track spending.
Receipt shows kWh, rate, cost, duration and station, and appears in history.
M5
4. Technology Stack
4.1 Agreed Technologies and Libraries
All packages are installed by the Leader in the starter repository at fixed versions. Do not add packages yourself – ask the Leader.
Area
Tool / library
Purpose
Cost
Language
TypeScript (strict) everywhere
One language for app and API
Free
Mobile
React Native + Expo (one fixed SDK), Expo Router
App, file-based navigation
Free
Mobile UI
React Native Paper (Material Design 3)
Ready components, theming
Free
Mobile data
Axios, TanStack Query
HTTP calls, caching, loading / error states
Free
Mobile forms
React Hook Form + Zod
Forms and validation
Free
Mobile device
expo-secure-store, expo-location, expo-camera, expo-image-picker, expo-image-manipulator
Token, location, QR scan, photos
Free
Mobile extras
react-native-webview (Leaflet map), react-native-qrcode-svg, react-native-gifted-charts, socket.io-client
Map, QR codes, charts, real-time
Free
Backend
Node.js LTS + Express.js
REST API
Free
ORM
Prisma
Typed DB access, migrations, transactions
Free
Database
Supabase PostgreSQL (database only)
Hosted Postgres
Free plan
Auth
bcryptjs, jsonwebtoken
Password hashing, JWT
Free
Validation
Zod
Request validation
Free
Security
helmet, cors, express-rate-limit
Headers, CORS, login rate limit
Free
Real-time
Socket.io
Live status, wallet, notifications
Free
Uploads
multer + Cloudinary (free plan)
Station photos, bank slips
Free plan
Maps / places
Leaflet + OpenStreetMap tiles, Nominatim
Map without API keys
Free
Dev tools
VS Code, tsx (watch mode), Postman or Thunder Client, Expo Go, Android Studio (optional)
Coding, API testing, device testing
Free
Hosting
Render (free web service)
Public HTTPS API for the APK
Free (sleeps)
Collaboration
Git + GitHub
Branches, pull requests
Free
Builds
EAS Build (free) or local Android build
Demo APK
Free (limited)
4.2 Development Requirements (every laptop)
Node.js LTS (same major version for all), npm, Git, VS Code, Postman or Thunder Client.
An Android phone with Expo Go matching the project's Expo SDK (or an Android emulator).
Phone and laptop on the same Wi-Fi during development.
Free accounts: GitHub, Supabase (personal dev project), Cloudinary (or use the Leader's dev keys).
4.3 Free-Tier Limitations and Workarounds
Service
Limitation
Workaround
Render (free)
Sleeps after about 15 minutes without traffic; first request can take close to a minute; no permanent disk.
Wake it 2–3 minutes before demos (GET /health); store files in Cloudinary, never on the server disk.
Supabase (free)
Project pauses after 7 days of inactivity; 500 MB database; 2 active projects per account; direct host is IPv6.
Open it the day before demos; use the pooler connection strings (DATABASE_URL port 6543 with ?pgbouncer=true, DIRECT_URL port 5432).
Cloudinary (free)
Monthly usage credits.
Resize images to about 1,000 px before upload; max 3 photos per station.
GitHub Free
Branch protection rules are available for public repos only (private repos need GitHub Pro / Team).
Use a public repo (never commit secrets), or get GitHub Pro free through the GitHub Student Developer Pack, or follow the PR-only rule strictly.
Expo / EAS
Limited free cloud builds per month (low-priority queue); remote push does not work in Expo Go on Android.
Leader builds the APK early on Day 2 (or locally); notifications are in-app via Socket.io.
Android release APK
Plain http:// is blocked by default.
The APK uses the Render HTTPS URL; laptop IP + HTTP only in Expo Go.
Google Maps
Needs a billing account.
Leaflet + OpenStreetMap in a WebView; directions via Google Maps / Waze links.
OSM / Nominatim
Attribution required; max 1 request per second.
Show '© OpenStreetMap contributors'; search only when a button is tapped.
Email / SMS
Need paid or extra providers.
No email verification or forgot-password emails; admin can reset passwords.
AI coding tools
Daily usage limits on free tiers.
One file per prompt; keep a second free tool as backup.
5. System Architecture
5.1 Overall Architecture
Three-tier client–server architecture. The mobile app talks only to our Express API; only the API talks to the database.
Architecture
┌──────────────────────────────┐   HTTPS + JSON (REST)   ┌──────────────────────────────────┐
│  Mobile app (Expo, RN, TS)   │ ──────────────────────▶ │  Express.js API (Node.js, TS)    │
│  screens → feature api.ts    │ ◀────────────────────── │  routes → controller → service   │
│  Axios + TanStack Query      │   Socket.io events      │  auth middleware, Zod, Prisma    │
└──────────────────────────────┘                         └───────────────┬──────────────────┘
                                                                         │ Prisma (pooler)
                                     ┌───────────────────────┐   ┌───────▼──────────────────┐
                                     │ Cloudinary (images)   │   │ Supabase PostgreSQL       │
                                     └───────────────────────┘   └──────────────────────────┘
5.2 Request Lifecycle (backend)
routes.ts sends /api/v1/<path> to the module router.
requireAuth checks the JWT (except Public routes) → requireRole checks the role → validate checks body / query / params with Zod.
The controller reads the request and calls the service.
The service does the work with Prisma; any credit change goes through credit.* inside withTx.
The controller returns { data }; thrown AppErrors become { error: { code, message } } in the error handler.
After a successful commit the service may emit Socket.io events (emitToUser, broadcast).
5.3 Module Structure and Ownership
Module
Backend folder
Mobile folder
Owner
Core platform
core/, app.ts, routes.ts, prisma/
src/lib, src/components, src/types, src/mocks, app/_layout.tsx
M1
Auth & wallet
modules/auth, modules/wallet
src/features/auth, src/features/wallet
M1
Profile, vehicles, transactions, slip top-ups, admin
modules/profile, vehicles, transactions, topups, admin
src/features/profile, src/features/admin
M2
Stations, reviews, favourites, notifications
modules/stations, reviews, favourites, notifications
src/features/map
M3
Owner
modules/owner
src/features/owner
M4
Sessions
modules/sessions
src/features/session
M5
5.4 Project Folder Structure
Monorepo layout (owner in brackets)
ev-charge-tracker/
├── backend/
│   ├── prisma/  schema.prisma, migrations/, seed.ts                     (M1)
│   ├── src/
│   │   ├── app.ts, server.ts, routes.ts, config.ts                     (M1)
│   │   ├── core/  db, errors, validate, auth.middleware, password,
│   │   │          credit.service, notify.service, socket, upload        (M1)
│   │   └── modules/
│   │       ├── auth/  wallet/                                          (M1)
│   │       ├── profile/  vehicles/  transactions/  topups/  admin/     (M2)
│   │       ├── stations/  reviews/  favourites/  notifications/        (M3)
│   │       ├── owner/                                                  (M4)
│   │       └── sessions/                                               (M5)
│   ├── postman/  <module>.postman_collection.json                      (each member)
│   ├── .env.example, package.json, tsconfig.json                       (M1)
├── mobile/
│   ├── app/                         Expo Router screens (see Section 10 / 5.5)
│   ├── src/
│   │   ├── lib/  components/  types/  mocks/                           (M1)
│   │   └── features/
│   │       ├── auth/  wallet/                                          (M1)
│   │       ├── profile/  admin/                                        (M2)
│   │       ├── map/                                                    (M3)
│   │       ├── owner/                                                  (M4)
│   │       └── session/                                                (M5)
│   ├── .env.example, app.json, package.json, tsconfig.json             (M1)
├── AI_CONTEXT.md, README.md, .gitignore                                 (M1)
Backend module pattern (every member uses exactly these four files):
backend/src/modules/<module>/
  <module>.routes.ts       Router: path + requireAuth / requireRole + validate + controller
  <module>.controller.ts   reads req, calls service, res.json({ data })
  <module>.service.ts      business logic with prisma / withTx / credit / notify
  <module>.schema.ts       Zod schemas for body, query and params
Mobile feature pattern:
mobile/src/features/<feature>/
  api.ts          real functions (Axios via @/lib/api) – names fixed in Section 9
  api.mock.ts     same signatures, returns data from @/mocks/fixtures
  index.ts        export const api = USE_MOCKS ? mock : real;
  components/     components used only by this feature
  hooks.ts        TanStack Query hooks (useStations, useStartSession, ...)
5.5 Mobile Navigation
Role
Tabs (bottom navigation)
Guest
Map (browse only; Login button in header)
Customer
Map · Sessions · Wallet · Profile
Owner
Dashboard · Stations · Earnings · Profile
Admin
Dashboard · Stations · Payments · Users
Root layout (M1) redirects after login: customer → /(customer)/map, owner → /(owner)/dashboard, admin → /(admin)/dashboard. Full route list with owners:
Route
Params
Screen
Owner
/login, /register
–
Login, register (group (auth))
M1 (Leader)
/(customer)/wallet
–
Customer tab: wallet
M1 (Leader)
/topup
amount?
Card top-up
M1 (Leader)
/payment-result
status, amount
Payment success / failed
M1 (Leader)
/topup-slip
–
Bank-slip top-up and my requests
M2
/transactions
–
Transaction history
M2
/(customer)/profile, /(owner)/profile, /(admin)/profile
–
Profile tab (one shared component)
M2
/profile/edit
–
Edit profile
M2
/vehicles, /vehicles/edit
id?
Vehicles list, add / edit vehicle
M2
/(admin)/dashboard, /(admin)/stations, /(admin)/payments, /(admin)/users
–
Admin tabs
M2
/(customer)/map
–
Customer tab: map home (with list toggle)
M3
/station/[id], /station/[id]/reviews
id
Station details, all reviews
M3
/review/new
stationId, sessionId
Write review
M3
/favourites, /notifications
–
Favourites, notifications
M3
/(owner)/dashboard, /(owner)/stations, /(owner)/earnings
–
Owner tabs
M4
/owner/station/new, /owner/station/[id]
id
Add / edit station with chargers
M4
/owner/charger/[id]/qr
id
Charger QR
M4
/owner/sessions, /owner/wallet
–
Owner sessions; owner wallet and withdrawals
M4
/(customer)/sessions
–
Customer tab: charging history
M5
/scan
–
QR scanner
M5
/charge/[token]
token
Start session
M5
/session/[id], /receipt/[id]
id
Live session, receipt
M5
5.6 Module Interactions
From
To
How
Why
Every backend module
M1 core
requireAuth, requireRole, validate, AppError, prisma, withTx
Same security and error handling everywhere
M2 admin, M4 withdrawals, M5 sessions
M1 credit engine
credit.credit / hold / release / settleSession / payoutHeld
All money moves in one safe place
M2, M4, M5
M1 notify
notify(…) / notifyAdmins(…) after commit
Creates notifications shown by M3
M1 tab layouts
M3 component
<NotificationBell /> from @/features/map
Unread badge in every tab header
M1 tab layouts
M2 screen
Profile tab route files belong to M2
Same profile screen for all roles
M5 sessions
M4 data
Reads chargers by qrToken, sets status busy / available
Charger the customer scanned
M4, M5
M3 map
Socket charger:status
Live marker colours
M3 station details
M5 scanner
Navigate to /scan
Charge here button
M5 start screen
M1 wallet
walletApi.getMyWallet(), /topup?amount=
Show balance, top up shortfall
M5 receipt
M3 reviews
Navigate to /review/new?stationId&sessionId
Rate after charging
M1 wallet screen
M2 screens
Navigate to /transactions, /topup-slip
History and slip top-up
M4 owner wallet
M1 wallet / M2 admin
getMyWallet; admin processes withdrawals
Payout flow
M2 admin
M4 stations
Updates stations.status
Approval makes stations public
5.7 Real-Time Events (Socket.io)
The app connects with io(API_ORIGIN, { auth: { token } }). The server joins each socket to room user:<id>. Only the backend emits events.
Event
Payload
Sent to
Emitted by
Used by
charger:status
{ chargerId, stationId, status }
Everyone
M4 (owner toggle), M5 (start / end / cancel)
M3 map and details; M4 dashboard
wallet:updated
Wallet
That user
M1 credit service (after commit)
M1 wallet; M4 owner wallet; M5 start screen
notification:new
AppNotification
That user
M1 notify service
M3 badge and list
session:updated
Session
Customer and station owner
M5
M5 live session; M4 owner sessions
6. Database Specifications
6.1 Conventions
PostgreSQL on Supabase, managed only through Prisma migrations created by the Leader. Nobody edits tables in the Supabase dashboard.
Table and column names are snake_case in the database; Prisma model fields and all API JSON use camelCase (@map / @@map).
Primary keys are UUID strings; timestamps are created_at (UTC). Money is Decimal(12,2) in credits; services convert Decimal to number (toNumber) before sending JSON.
Members never change schema.prisma. If a field is missing, ask the Leader – the change is made once for everyone.
6.2 Relationships
Relationship
Type
On delete
User → Wallet
1 : 1 (platform wallet has no user)
–
User → Vehicle
1 : many
Cascade
User (owner) → Station → Charger
1 : many : many
Station → Charger cascade
Wallet → Transaction
1 : many (ledger)
–
User (customer) → Session ← Charger, Station
Session belongs to customer, charger and station
–
Session → Review
1 : 0..1
–
User → TopupRequest, Withdrawal, Notification
1 : many
Notification cascade
User ↔ Station via Favourite
many : many
Cascade
6.3 Prisma Schema (exact)
backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
enum Role { customer owner admin }
enum ConnectorType { TYPE1 TYPE2 CCS2 CHADEMO GBT }
enum StationStatus { pending approved rejected }
enum ChargerStatus { available busy offline }
enum SessionStatus { active completed cancelled disputed }
enum TxnType { topup hold release charge earning commission withdrawal }
enum TopupMethod { card slip }
enum RequestStatus { pending approved rejected }
enum WithdrawalStatus { pending paid rejected }
model User {
  id            String         @id @default(uuid())
  email         String         @unique
  passwordHash  String         @map("password_hash")
  fullName      String         @map("full_name")
  phone         String?
  role          Role           @default(customer)
  isBlocked     Boolean        @default(false) @map("is_blocked")
  createdAt     DateTime       @default(now()) @map("created_at")
  wallet        Wallet?
  vehicles      Vehicle[]
  stations      Station[]
  sessions      Session[]
  topups        TopupRequest[]
  withdrawals   Withdrawal[]
  reviews       Review[]
  favourites    Favourite[]
  notifications Notification[]
  @@map("users")
}
model Vehicle {
  id         String        @id @default(uuid())
  userId     String        @map("user_id")
  user       User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  makeModel  String        @map("make_model")
  connector  ConnectorType
  batteryKwh Decimal?      @map("battery_kwh") @db.Decimal(6, 1)
  createdAt  DateTime      @default(now()) @map("created_at")
  @@map("vehicles")
}
model Station {
  id           String        @id @default(uuid())
  ownerId      String        @map("owner_id")
  owner        User          @relation(fields: [ownerId], references: [id])
  name         String
  description  String?
  address      String
  lat          Float
  lng          Float
  openingHours String        @map("opening_hours")
  amenities    String[]      @default([])
  photos       String[]      @default([])
  status       StationStatus @default(pending)
  rejectReason String?       @map("reject_reason")
  createdAt    DateTime      @default(now()) @map("created_at")
  chargers     Charger[]
  sessions     Session[]
  reviews      Review[]
  favourites   Favourite[]
  @@index([status])
  @@map("stations")
}
model Charger {
  id         String        @id @default(uuid())
  stationId  String        @map("station_id")
  station    Station       @relation(fields: [stationId], references: [id], onDelete: Cascade)
  label      String
  connector  ConnectorType
  powerKw    Decimal       @map("power_kw") @db.Decimal(6, 1)
  ratePerKwh Decimal       @map("rate_per_kwh") @db.Decimal(10, 2)
  status     ChargerStatus @default(available)
  qrToken    String        @unique @map("qr_token")
  createdAt  DateTime      @default(now()) @map("created_at")
  sessions   Session[]
  @@map("chargers")
}
model Wallet {
  id           String        @id @default(uuid())
  userId       String?       @unique @map("user_id")
  user         User?         @relation(fields: [userId], references: [id])
  balance      Decimal       @default(0) @db.Decimal(12, 2)
  held         Decimal       @default(0) @db.Decimal(12, 2)
  updatedAt    DateTime      @updatedAt @map("updated_at")
  transactions Transaction[]
  @@map("wallets")
}
model Transaction {
  id        String   @id @default(uuid())
  walletId  String   @map("wallet_id")
  wallet    Wallet   @relation(fields: [walletId], references: [id])
  type      TxnType
  amount    Decimal  @db.Decimal(12, 2)
  refType   String?  @map("ref_type")
  refId     String?  @map("ref_id")
  note      String?
  createdAt DateTime @default(now()) @map("created_at")
  @@index([walletId, createdAt])
  @@map("transactions")
}
model TopupRequest {
  id         String        @id @default(uuid())
  userId     String        @map("user_id")
  user       User          @relation(fields: [userId], references: [id])
  amount     Decimal       @db.Decimal(12, 2)
  method     TopupMethod
  slipUrl    String?       @map("slip_url")
  status     RequestStatus @default(pending)
  reason     String?
  reviewedBy String?       @map("reviewed_by")
  createdAt  DateTime      @default(now()) @map("created_at")
  @@map("topup_requests")
}
model Session {
  id            String        @id @default(uuid())
  customerId    String        @map("customer_id")
  customer      User          @relation(fields: [customerId], references: [id])
  chargerId     String        @map("charger_id")
  charger       Charger       @relation(fields: [chargerId], references: [id])
  stationId     String        @map("station_id")
  station       Station       @relation(fields: [stationId], references: [id])
  spendingLimit Decimal       @map("spending_limit") @db.Decimal(12, 2)
  kwh           Decimal?      @db.Decimal(8, 2)
  cost          Decimal?      @db.Decimal(12, 2)
  commission    Decimal?      @db.Decimal(12, 2)
  status        SessionStatus @default(active)
  disputeReason String?       @map("dispute_reason")
  startedAt     DateTime      @default(now()) @map("started_at")
  endedAt       DateTime?     @map("ended_at")
  review        Review?
  @@index([customerId])
  @@index([chargerId, status])
  @@map("sessions")
}
model Withdrawal {
  id          String           @id @default(uuid())
  ownerId     String           @map("owner_id")
  owner       User             @relation(fields: [ownerId], references: [id])
  amount      Decimal          @db.Decimal(12, 2)
  bankNote    String           @map("bank_note")
  status      WithdrawalStatus @default(pending)
  processedBy String?          @map("processed_by")
  createdAt   DateTime         @default(now()) @map("created_at")
  @@map("withdrawals")
}
model Review {
  id         String   @id @default(uuid())
  stationId  String   @map("station_id")
  station    Station  @relation(fields: [stationId], references: [id], onDelete: Cascade)
  customerId String   @map("customer_id")
  customer   User     @relation(fields: [customerId], references: [id])
  sessionId  String   @unique @map("session_id")
  session    Session  @relation(fields: [sessionId], references: [id])
  rating     Int
  comment    String?
  createdAt  DateTime @default(now()) @map("created_at")
  @@map("reviews")
}
model Favourite {
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stationId String   @map("station_id")
  station   Station  @relation(fields: [stationId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now()) @map("created_at")
  @@id([userId, stationId])
  @@map("favourites")
}
model Notification {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  body      String
  type      String
  refId     String?  @map("ref_id")
  read      Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")
  @@index([userId, read])
  @@map("notifications")
}
6.4 Constraints and Business Rules
Rule
Enforced in
Emails are unique and stored lower-case
DB unique + M1 auth service
Wallet balance ≥ 0, held ≥ 0, held ≤ balance
M1 credit service (row lock + checks) + SQL check constraint in the first migration
Only one active session per customer and per charger
M5 service inside a transaction
rating between 1 and 5; one review per session
Zod (M3) + unique session_id
Stations are visible to the public only when approved
M3 queries filter status = 'approved'
Charger status is busy only while a session is active; owners may toggle only available ↔ offline
M5 / M4 services
Amounts: top-ups 100–50,000; spending limit 100–20,000; withdrawals ≥ 500 and ≤ available
Zod + services
qrToken is 12 random URL-safe characters, unique
M4 service (crypto.randomBytes) + DB unique
Dispute only within 24 hours of endedAt, only on completed sessions
M4 service
6.5 Data Access by Module
RW = reads and writes with Prisma; R = reads only; credit = changes only through credit.*; notify = only through notify(). Your column is the one marked with your member number.
Table
M1
M2
M3
M4
M5
users
RW (auth)
RW (profile, block, password)
R (names)
R (names)
R (names)
vehicles
–
RW
–
–
–
stations
–
RW (status only)
R
RW (own)
R
chargers
–
R
R
RW (own)
RW (status)
wallets
RW (credit service only)
credit
–
credit
credit
transactions
W (credit service)
R (own user's)
–
R (earnings)
–
topup_requests
RW (card)
RW (slip, review)
–
–
–
sessions
–
–
R (review check)
R + dispute
RW
withdrawals
–
RW (process)
–
RW (create, list own)
–
reviews
–
–
RW
–
R (hasReview)
favourites
–
–
RW
–
–
notifications
W (notify service)
notify
RW (read, mark read)
notify
notify

9.6 API Contract Reference
Full API index (all modules)
Base URL /api/v1. Auth: Public = no token; User = any logged-in user; Customer / Owner / Admin = that role only. Your rows are highlighted.
Method and path
Auth
Request → response
App function
Owner
GET /health
Public
→ { ok: true }
–
M1 (Leader)
POST /auth/register
Public
{ email, password, fullName, role } → { token, user }
signUp
M1 (Leader)
POST /auth/login
Public
{ email, password } → { token, user }
signIn
M1 (Leader)
GET /auth/me
User
→ User
getMe
M1 (Leader)
GET /wallet
User
→ Wallet
getMyWallet
M1 (Leader)
POST /wallet/topup
Customer
{ amount, cardNumber } → Wallet
topUpWithCard
M1 (Leader)
GET /profile
User
→ User
getProfile
M2
PATCH /profile
User
{ fullName?, phone? } → User
updateProfile
M2
GET /vehicles
Customer
→ Vehicle[]
listVehicles
M2
POST /vehicles
Customer
VehicleInput → Vehicle
createVehicle
M2
PATCH /vehicles/:id
Customer
Partial<VehicleInput> → Vehicle
updateVehicle
M2
DELETE /vehicles/:id
Customer
→ { ok: true }
deleteVehicle
M2
GET /transactions?type=
User
→ Transaction[]
listTransactions
M2
POST /topups/slip
Customer
multipart amount, image → TopupRequest
requestSlipTopUp
M2
GET /topups
Customer
→ TopupRequest[]
listMyTopups
M2
GET /admin/counts
Admin
→ AdminCounts
getAdminCounts
M2
GET /admin/stations?status=
Admin
→ AdminStation[]
listStationsByStatus
M2
POST /admin/stations/:id/review
Admin
{ approve, reason? } → Station
reviewStation
M2
GET /admin/topups?status=
Admin
→ AdminTopup[]
listTopups
M2
POST /admin/topups/:id/review
Admin
{ approve, reason? } → TopupRequest
reviewTopup
M2
GET /admin/withdrawals?status=
Admin
→ AdminWithdrawal[]
listWithdrawals
M2
POST /admin/withdrawals/:id/process
Admin
{ approve } → Withdrawal
processWithdrawal
M2
GET /admin/users
Admin
→ User[]
listUsers
M2
PATCH /admin/users/:id/block
Admin
{ blocked } → User
setUserBlocked
M2
PATCH /admin/users/:id/password
Admin
{ newPassword } → { ok: true }
resetUserPassword
M2
GET /stations
Public
query StationFilters → StationSummary[]
listStations
M3
GET /stations/:id
Public
→ StationDetail
getStation
M3
GET /stations/:id/reviews
Public
→ Review[]
listReviews
M3
POST /reviews
Customer
{ sessionId, rating, comment? } → Review
addReview
M3
GET /favourites
Customer
→ StationSummary[]
listFavourites
M3
POST /favourites/:stationId
Customer
→ { favourite: boolean }
toggleFavourite
M3
GET /notifications
User
→ AppNotification[]
listNotifications
M3
PATCH /notifications/:id/read
User
→ { ok: true }
markNotificationRead
M3
PATCH /notifications/read-all
User
→ { ok: true }
markAllNotificationsRead
M3
GET /owner/stations
Owner
→ StationDetail[]
listMyStations
M4
POST /owner/stations
Owner
StationInput → Station
createStation
M4
PATCH /owner/stations/:id
Owner
Partial<StationInput> → Station
updateStation
M4
POST /owner/stations/:id/photos
Owner
multipart image → { url }
uploadStationPhoto
M4
POST /owner/stations/:id/chargers
Owner
ChargerInput → Charger
createCharger
M4
PATCH /owner/chargers/:id
Owner
Partial<ChargerInput> → Charger
updateCharger
M4
DELETE /owner/chargers/:id
Owner
→ { ok: true }
deleteCharger
M4
PATCH /owner/chargers/:id/status
Owner
{ status } → Charger
setChargerStatus
M4
GET /owner/sessions
Owner
→ SessionWithNames[]
listOwnerSessions
M4
POST /owner/sessions/:id/dispute
Owner
{ reason } → Session
disputeSession
M4
GET /owner/earnings?from=&to=
Owner
→ EarningsDay[]
getEarnings
M4
GET /owner/withdrawals
Owner
→ Withdrawal[]
listMyWithdrawals
M4
POST /owner/withdrawals
Owner
{ amount, bankNote } → Withdrawal
requestWithdrawal
M4
GET /sessions/charger/:qrToken
Customer
→ ChargerLookup
getChargerByQr
M5
POST /sessions/start
Customer
{ qrToken, spendingLimit } → Session
startSession
M5
POST /sessions/:id/end
Customer
{ kwh } → Session
endSession
M5
POST /sessions/:id/cancel
Customer
→ Session
cancelSession
M5
GET /sessions/active
Customer
→ SessionWithNames | null
getActiveSession
M5
GET /sessions
Customer
→ SessionWithNames[]
listMySessions
M5
GET /sessions/:id
Customer
→ SessionWithNames
getSession
M5
Response and error format
// success (200 / 201)
{ "data": { ... } }
// error
{ "error": { "code": "CHARGER_BUSY", "message": "This charger is already in use" } }
HTTP status
Error codes (use exactly these)
400
VALIDATION_ERROR, INVALID_AMOUNT, INVALID_KWH, INVALID_RATING
401
UNAUTHENTICATED, INVALID_CREDENTIALS, TOKEN_EXPIRED
402
INSUFFICIENT_BALANCE, CARD_DECLINED
403
NOT_ALLOWED, USER_BLOCKED
404
NOT_FOUND, CHARGER_NOT_FOUND, SESSION_NOT_FOUND
409
EMAIL_TAKEN, CHARGER_BUSY, CHARGER_OFFLINE, ACTIVE_SESSION_EXISTS, SESSION_NOT_ACTIVE, ALREADY_REVIEWED, ALREADY_PROCESSED, DISPUTE_WINDOW_CLOSED, STATION_NOT_APPROVED
500
SERVER_ERROR
Shared TypeScript types (mobile/src/types/domain.ts – owned by M1)
export type Role = 'customer' | 'owner' | 'admin';
export type ConnectorType = 'TYPE1' | 'TYPE2' | 'CCS2' | 'CHADEMO' | 'GBT';
export type StationStatus = 'pending' | 'approved' | 'rejected';
export type ChargerStatus = 'available' | 'busy' | 'offline';
export type SessionStatus = 'active' | 'completed' | 'cancelled' | 'disputed';
export type TxnType = 'topup' | 'hold' | 'release' | 'charge' | 'earning' | 'commission' | 'withdrawal';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type WithdrawalStatus = 'pending' | 'paid' | 'rejected';
export interface User { id: string; email: string; fullName: string; phone: string | null; role: Role; isBlocked: boolean; createdAt: string }
export interface Vehicle { id: string; makeModel: string; connector: ConnectorType; batteryKwh: number | null }
export type VehicleInput = Omit<Vehicle, 'id'>;
export interface Station { id: string; ownerId: string; name: string; description: string | null; address: string; lat: number; lng: number; openingHours: string; amenities: string[]; photos: string[]; status: StationStatus; rejectReason: string | null; createdAt: string }
export type StationInput = Pick<Station, 'name' | 'description' | 'address' | 'lat' | 'lng' | 'openingHours' | 'amenities'>;
export interface Charger { id: string; stationId: string; label: string; connector: ConnectorType; powerKw: number; ratePerKwh: number; status: ChargerStatus; qrToken: string }
export type ChargerInput = Pick<Charger, 'label' | 'connector' | 'powerKw' | 'ratePerKwh'>;
export interface StationSummary extends Station { avgRating: number | null; reviewCount: number; chargerCount: number; availableCount: number; connectors: ConnectorType[]; minRate: number | null; maxPowerKw: number | null; distanceKm?: number }
export interface StationDetail extends StationSummary { chargers: Charger[]; isFavourite?: boolean }
export interface StationFilters { connector?: ConnectorType; minPowerKw?: number; maxRate?: number; availableOnly?: boolean; search?: string; lat?: number; lng?: number }
export interface ChargerLookup { charger: Charger; station: Pick<Station, 'id' | 'name' | 'address'>; available: number }
export interface Wallet { balance: number; held: number; available: number }
export interface Transaction { id: string; type: TxnType; amount: number; refType: string | null; refId: string | null; note: string | null; createdAt: string }
export interface TopupRequest { id: string; amount: number; method: 'card' | 'slip'; slipUrl: string | null; status: RequestStatus; reason: string | null; createdAt: string }
export interface Session { id: string; customerId: string; chargerId: string; stationId: string; spendingLimit: number; kwh: number | null; cost: number | null; commission: number | null; status: SessionStatus; disputeReason: string | null; startedAt: string; endedAt: string | null }
export interface SessionWithNames extends Session { stationName: string; chargerLabel: string; connector: ConnectorType; powerKw: number; ratePerKwh: number; customerName: string; hasReview: boolean }
export interface Withdrawal { id: string; amount: number; bankNote: string; status: WithdrawalStatus; createdAt: string }
export interface Review { id: string; stationId: string; customerName: string; rating: number; comment: string | null; createdAt: string }
export interface AppNotification { id: string; title: string; body: string; type: string; refId: string | null; read: boolean; createdAt: string }
export interface EarningsDay { day: string; earnings: number; commission: number; sessions: number }
export interface AdminCounts { pendingStations: number; pendingTopups: number; pendingWithdrawals: number; users: number }
export interface AdminStation extends Station { ownerName: string; chargerCount: number }
export interface AdminTopup extends TopupRequest { userName: string }
export interface AdminWithdrawal extends Withdrawal { ownerName: string }

13. Coding Standards and AI-Assisted Development
All five members follow the same standards so the project reads as one consistent, student-written codebase that every member can explain in the viva.
13.1 Code Style
Simple and readable first. Write the plainest working solution. No design-pattern layers, generic base classes, factories or helper libraries the project does not need.
Comments only when needed to explain non-obvious logic (for example, why a cost is capped). No file banners, no section-divider comments, no comments that repeat the code, no emojis.
No AI-related labels, signatures or notes anywhere in code, commits or pull requests. Remove anything an AI tool adds that is not part of the actual implementation.
No unused code, imports, variables, console.log debugging or commented-out blocks in commits.
Formatting: Prettier defaults (2 spaces, single quotes, semicolons, 100-character lines). Run Format Document before committing.
TypeScript strict; avoid any (use the shared types). Use async/await, not .then() chains.
Keep functions short; one screen or one service function should do one job.
13.2 Naming Conventions
Thing
Convention
Example
Variables, functions
camelCase, descriptive
spendingLimit, startSession()
React components and component files
PascalCase
StationCard.tsx, ChargerList
Expo Router screen files
lower-case route names (fixed in Section 5.5)
app/station/[id].tsx
Hooks
use + PascalCase
useActiveSession()
Backend files
<module>.<role>.ts
sessions.service.ts
Constants
UPPER_SNAKE_CASE
COMMISSION_RATE
Database
snake_case (via Prisma @map)
spending_limit
API JSON fields
camelCase
spendingLimit
URL paths
lower-case, plural nouns, kebab-case
/owner/withdrawals
Error codes
UPPER_SNAKE_CASE from Section 9
INSUFFICIENT_BALANCE
13.3 Backend Rules
Every route uses requireAuth unless the API index marks it Public; owner / admin / customer routes also use requireRole; owner resources use assertOwner.
Validate every body, query and params with Zod in <module>.schema.ts.
Throw new AppError('CODE', status); never res.status(...).send(...) errors by hand; never return stack traces or passwordHash.
Never update wallets or transactions directly – only credit.*. Wrap multi-step changes in withTx.
Return only the fields defined in the shared types (map Prisma results to plain objects; convert Decimals with toNumber).
13.4 Mobile Rules
Screens call only their feature's api (through hooks); never import Axios in a screen.
Use TanStack Query for loading / error states; use the shared components (LoadingView, EmptyState, ErrorView, AppButton…). No hard-coded colours – use the theme.
Forms use React Hook Form + Zod; show errors under the field; disable the submit button while submitting.
Use only routes from Section 5.5 and only types from @/types/domain.
Every api.ts function has an identical mock in api.mock.ts so the screen works with USE_MOCKS = true.
13.5 Using AI Coding Tools
Start every new AI chat by pasting AI_CONTEXT.md (or this document) and the prompt template below.
Ask for one endpoint, one screen or one hook at a time. Test it before moving on.
Read and understand every line before keeping it – you must be able to explain your code in the viva.
Reject suggestions that add packages, new names, extra abstraction or features not in this document.
AI tools must never run Git commands (commit, push, merge, rebase, reset, branch deletion) or create pull requests. They may only *suggest* commands; you review and run them yourself.
AI prompt template (copy, then fill the <…> parts)
I am <Member N> working on the <area> of the EV Charging Point Tracker (Expo Router + TypeScript app, Express.js + Prisma API, Supabase Postgres). Follow the attached specification exactly.
Only create or edit these files: <files>. Use only existing packages, shared types from @/types/domain, shared components from @/components, and backend core helpers (requireAuth, requireRole, validate, AppError, prisma, withTx, credit.*, notify).
Write simple, readable, student-level code with minimal comments (only for complex logic), no extra abstractions, and no AI-related notes or labels.
Do not run any Git commands or create pull requests; if Git steps are needed, list the commands for me to run.
Task: <one endpoint / screen / hook, with expected behaviour>.
14. GitHub Repository and Collaboration Workflow
14.1 Branches
Branch
Purpose
Who can change it
main
Protected, stable releases only (demo / submission)
Only the Group Leader, by merging develop after final testing
develop
Central integration branch
Only the Group Leader, by merging reviewed pull requests
feature/<name>
One branch per functionality, created from develop
The member who owns that functionality
fix/<name>
Bug fixes after a feature was merged, created from develop
The member who owns the code
Member
Feature branches
Member 1 – Harshana (Group Leader) – Backend Core, Authentication & Credit Engine
feature/backend-core, feature/user-authentication, feature/credit-wallet
Member 2 – Profile, Admin Panel & Payment Approvals
feature/profile-vehicles, feature/payment-approvals, feature/admin-dashboard
Member 3 – Map, Discovery, Reviews & Notifications
feature/station-map, feature/station-details-reviews, feature/notifications
Member 4 – Station Owner Module
feature/owner-stations, feature/owner-earnings-withdrawals
Member 5 – Charging Sessions
feature/charging-sessions
14.2 Branch Protection
main and develop: require a pull request before merging, restrict who can push to the Group Leader, block force pushes and deletion.
On GitHub Free this is available on public repositories. If the repository is private, the Leader uses GitHub Pro from the GitHub Student Developer Pack, or the team follows the pull-request-only rule without exception.
Whether public or private: never commit .env files, passwords, database URLs, JWT secrets or Cloudinary keys. Only .env.example with empty values is committed.
14.3 Pull Request Workflow
Update your local develop and create your feature branch from it.
Develop and test your functionality on your feature branch only.
Review your own changes (git status, git diff), then manually commit and push.
Open a pull request on GitHub: base develop ← compare feature/<name>, using the PR template below.
The Group Leader reviews, checks compatibility, resolves integration issues and merges into develop.
After each merge round, update your branch with the latest develop before continuing.
After final testing the Group Leader merges develop into main and tags the release.
Git commands (run them yourself – never let an AI tool run them)
# first time
git clone <repository-url>
cd ev-charge-tracker
git checkout develop
git pull origin develop
git checkout -b feature/<your-branch-name>
# while working (review before every commit)
git status
git diff
git add <the files you changed>
git commit -m "feat(<module>): <short description>"
git push -u origin feature/<your-branch-name>
# after the Leader merges a round into develop
git checkout develop
git pull origin develop
git checkout feature/<your-branch-name>
git merge develop
14.4 Commit Messages and Pull Requests
Format: <type>(<module>): <what changed> with type feat, fix, refactor, style, test or docs. Example: feat(sessions): add end session endpoint.
Small, focused commits; one pull request per feature branch; no unrelated files.
Pull request template
## What this PR adds
- <endpoints / screens>
## Related requirements
- FR-xx, US-xx
## How I tested
- Postman: <requests>   Phone: <screens and steps>
## Checklist
- [ ] npx tsc --noEmit passes in backend/ and mobile/
- [ ] Only my folders changed; no package.json or schema.prisma changes
- [ ] Names match Section 9; mock and real api.ts have the same signatures
- [ ] No .env or secrets committed
14.5 Manual Git Operations Only
Nobody – and no AI tool – automatically commits, pushes, merges, rebases or opens pull requests.
Never rewrite history on shared branches (git push --force, git reset --hard on pushed commits) without the Leader's approval.
If you are unsure about a Git step, ask the Leader before running it.
15. Two-Day Timeline and Integration Points
Times are a guide; the order and the merge rounds are fixed. At each merge round members open or update their pull requests to develop, the Leader merges and redeploys, and everyone merges the new develop into their branch.
Time
Group Leader (M1)
Members 2–5
Result
Day 1 08:00–08:30
Kick-off: walk through the specifications
Read your document; set up tools and a personal Supabase dev project
Shared understanding
08:30–10:00
Push the starter to develop and main; set branch protection
Prepare screens on paper; wait for starter
Starter repository ready
Round 0 10:00
Help everyone run backend and app
Pull develop, create feature branch, npx prisma migrate deploy + seed on own dev DB
Same setup on every laptop
10:00–13:00
Real JWT auth, guards, login screens; credit service
Own endpoints (dev header x-dev-user-id) and screens on mocks
Endpoints work in Postman
Round 1 13:00
Review and merge PRs; deploy develop to Render; share API URL
Open PRs; then merge develop; switch to real login and USE_MOCKS = false
Shared backend live
14:00–18:00
Wallet and card top-up screens; Socket.io; integration fixes
Connect screens to the real API; finish Must items
Modules connected
Round 2 18:00
Merge; test scan → session → payment → earnings → withdrawal
Update PRs; fix review comments
Core flow works
19:00–22:00
Seed data; bug fixes
Finish all Must requirements
All M items done
Round 3 22:00
Merge; publish bug list
Update PRs
Bug list for Day 2
Day 2 08:00–11:00
Fixes; security check of every route
fix/ branches; Should items only if M items work
Stable build
Round 4 / Feature freeze 11:00
Merge; redeploy; start APK build
Final PRs
Feature-complete develop
11:00–14:00
End-to-end testing with all roles
Peer testing; polish UI states
Tested build
14:00–16:00
Merge develop → main; tag v1.0; final APK
Screenshots, Postman exports, report sections
Release on main
16:00–18:00
Compile report; demo rehearsal
Demo rehearsal
Ready to present
16. Environment Setup
# backend/.env  (never committed)
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...pooler.supabase.com:5432/postgres"
JWT_SECRET="<long random string>"
CLOUDINARY_CLOUD_NAME=""   CLOUDINARY_API_KEY=""   CLOUDINARY_API_SECRET=""
PORT=4000
NODE_ENV=development
# mobile/.env
EXPO_PUBLIC_API_URL="http://<your-laptop-wifi-ip>:4000/api/v1"   # Render HTTPS URL after Round 1
EXPO_PUBLIC_USE_MOCKS="true"                                       # false after Round 1
cd backend && npm ci then npx prisma migrate deploy and npx prisma db seed (on your personal dev database until Round 1).
npm run dev – API on port 4000; open http://localhost:4000/api/v1/health to check.
cd mobile && npm ci then npx expo start; scan the QR code with Expo Go.
Before Round 1, test protected endpoints with header x-dev-user-id: <a seeded user id> (development only; removed in production).
Seeded demo accounts (password Password123): admin@evct.lk, owner@evct.lk, customer@evct.lk.
```

## backend/prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  customer
  owner
  admin
}

enum ConnectorType {
  TYPE1
  TYPE2
  CCS2
  CHADEMO
  GBT
}

enum StationStatus {
  pending
  approved
  rejected
}

enum ChargerStatus {
  available
  busy
  offline
}

enum SessionStatus {
  active
  completed
  cancelled
  disputed
}

enum TxnType {
  topup
  hold
  release
  charge
  earning
  commission
  withdrawal
}

enum TopupMethod {
  card
  slip
}

enum RequestStatus {
  pending
  approved
  rejected
}

enum WithdrawalStatus {
  pending
  paid
  rejected
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  passwordHash  String         @map("password_hash")
  fullName      String         @map("full_name")
  phone         String?
  role          Role           @default(customer)
  isBlocked     Boolean        @default(false) @map("is_blocked")
  createdAt     DateTime       @default(now()) @map("created_at")
  wallet        Wallet?
  vehicles      Vehicle[]
  stations      Station[]
  sessions      Session[]
  topups        TopupRequest[]
  withdrawals   Withdrawal[]
  reviews       Review[]
  favourites    Favourite[]
  notifications Notification[]
  @@map("users")
}

model Vehicle {
  id         String        @id @default(uuid())
  userId     String        @map("user_id")
  user       User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  makeModel  String        @map("make_model")
  connector  ConnectorType
  batteryKwh Decimal?      @map("battery_kwh") @db.Decimal(6, 1)
  createdAt  DateTime      @default(now()) @map("created_at")
  @@map("vehicles")
}

model Station {
  id           String        @id @default(uuid())
  ownerId      String        @map("owner_id")
  owner        User          @relation(fields: [ownerId], references: [id])
  name         String
  description  String?
  address      String
  lat          Float
  lng          Float
  openingHours String        @map("opening_hours")
  amenities    String[]      @default([])
  photos       String[]      @default([])
  status       StationStatus @default(pending)
  rejectReason String?       @map("reject_reason")
  createdAt    DateTime      @default(now()) @map("created_at")
  chargers     Charger[]
  sessions     Session[]
  reviews      Review[]
  favourites   Favourite[]
  @@index([status])
  @@map("stations")
}

model Charger {
  id         String        @id @default(uuid())
  stationId  String        @map("station_id")
  station    Station       @relation(fields: [stationId], references: [id], onDelete: Cascade)
  label      String
  connector  ConnectorType
  powerKw    Decimal       @map("power_kw") @db.Decimal(6, 1)
  ratePerKwh Decimal       @map("rate_per_kwh") @db.Decimal(10, 2)
  status     ChargerStatus @default(available)
  qrToken    String        @unique @map("qr_token")
  createdAt  DateTime      @default(now()) @map("created_at")
  sessions   Session[]
  @@map("chargers")
}

model Wallet {
  id           String        @id @default(uuid())
  userId       String?       @unique @map("user_id")
  user         User?         @relation(fields: [userId], references: [id])
  balance      Decimal       @default(0) @db.Decimal(12, 2)
  held         Decimal       @default(0) @db.Decimal(12, 2)
  updatedAt    DateTime      @updatedAt @map("updated_at")
  transactions Transaction[]
  @@map("wallets")
}

model Transaction {
  id        String   @id @default(uuid())
  walletId  String   @map("wallet_id")
  wallet    Wallet   @relation(fields: [walletId], references: [id])
  type      TxnType
  amount    Decimal  @db.Decimal(12, 2)
  refType   String?  @map("ref_type")
  refId     String?  @map("ref_id")
  note      String?
  createdAt DateTime @default(now()) @map("created_at")
  @@index([walletId, createdAt])
  @@map("transactions")
}

model TopupRequest {
  id         String        @id @default(uuid())
  userId     String        @map("user_id")
  user       User          @relation(fields: [userId], references: [id])
  amount     Decimal       @db.Decimal(12, 2)
  method     TopupMethod
  slipUrl    String?       @map("slip_url")
  status     RequestStatus @default(pending)
  reason     String?
  reviewedBy String?       @map("reviewed_by")
  createdAt  DateTime      @default(now()) @map("created_at")
  @@map("topup_requests")
}

model Session {
  id            String        @id @default(uuid())
  customerId    String        @map("customer_id")
  customer      User          @relation(fields: [customerId], references: [id])
  chargerId     String        @map("charger_id")
  charger       Charger       @relation(fields: [chargerId], references: [id])
  stationId     String        @map("station_id")
  station       Station       @relation(fields: [stationId], references: [id])
  spendingLimit Decimal       @map("spending_limit") @db.Decimal(12, 2)
  kwh           Decimal?      @db.Decimal(8, 2)
  cost          Decimal?      @db.Decimal(12, 2)
  commission    Decimal?      @db.Decimal(12, 2)
  status        SessionStatus @default(active)
  disputeReason String?       @map("dispute_reason")
  startedAt     DateTime      @default(now()) @map("started_at")
  endedAt       DateTime?     @map("ended_at")
  review        Review?
  @@index([customerId])
  @@index([chargerId, status])
  @@map("sessions")
}

model Withdrawal {
  id          String           @id @default(uuid())
  ownerId     String           @map("owner_id")
  owner       User             @relation(fields: [ownerId], references: [id])
  amount      Decimal          @db.Decimal(12, 2)
  bankNote    String           @map("bank_note")
  status      WithdrawalStatus @default(pending)
  processedBy String?          @map("processed_by")
  createdAt   DateTime         @default(now()) @map("created_at")
  @@map("withdrawals")
}

model Review {
  id         String   @id @default(uuid())
  stationId  String   @map("station_id")
  station    Station  @relation(fields: [stationId], references: [id], onDelete: Cascade)
  customerId String   @map("customer_id")
  customer   User     @relation(fields: [customerId], references: [id])
  sessionId  String   @unique @map("session_id")
  session    Session  @relation(fields: [sessionId], references: [id])
  rating     Int
  comment    String?
  createdAt  DateTime @default(now()) @map("created_at")
  @@map("reviews")
}

model Favourite {
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stationId String   @map("station_id")
  station   Station  @relation(fields: [stationId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now()) @map("created_at")
  @@id([userId, stationId])
  @@map("favourites")
}

model Notification {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  body      String
  type      String
  refId     String?  @map("ref_id")
  read      Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")
  @@index([userId, read])
  @@map("notifications")
}
```

## mobile/src/types/domain.ts

```typescript
export type Role = 'customer' | 'owner' | 'admin';
export type ConnectorType = 'TYPE1' | 'TYPE2' | 'CCS2' | 'CHADEMO' | 'GBT';
export type StationStatus = 'pending' | 'approved' | 'rejected';
export type ChargerStatus = 'available' | 'busy' | 'offline';
export type SessionStatus = 'active' | 'completed' | 'cancelled' | 'disputed';
export type TxnType =
  | 'topup'
  | 'hold'
  | 'release'
  | 'charge'
  | 'earning'
  | 'commission'
  | 'withdrawal';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type WithdrawalStatus = 'pending' | 'paid' | 'rejected';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  isBlocked: boolean;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  makeModel: string;
  connector: ConnectorType;
  batteryKwh: number | null;
}

export type VehicleInput = Omit<Vehicle, 'id'>;

export interface Station {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  address: string;
  lat: number;
  lng: number;
  openingHours: string;
  amenities: string[];
  photos: string[];
  status: StationStatus;
  rejectReason: string | null;
  createdAt: string;
}

export type StationInput = Pick<
  Station,
  'name' | 'description' | 'address' | 'lat' | 'lng' | 'openingHours' | 'amenities'
>;

export interface Charger {
  id: string;
  stationId: string;
  label: string;
  connector: ConnectorType;
  powerKw: number;
  ratePerKwh: number;
  status: ChargerStatus;
  qrToken: string;
}

export type ChargerInput = Pick<Charger, 'label' | 'connector' | 'powerKw' | 'ratePerKwh'>;

export interface StationSummary extends Station {
  avgRating: number | null;
  reviewCount: number;
  chargerCount: number;
  availableCount: number;
  connectors: ConnectorType[];
  minRate: number | null;
  maxPowerKw: number | null;
  distanceKm?: number;
}

export interface StationDetail extends StationSummary {
  chargers: Charger[];
  isFavourite?: boolean;
}

export interface StationFilters {
  connector?: ConnectorType;
  minPowerKw?: number;
  maxRate?: number;
  availableOnly?: boolean;
  search?: string;
  lat?: number;
  lng?: number;
}

export interface ChargerLookup {
  charger: Charger;
  station: Pick<Station, 'id' | 'name' | 'address'>;
  available: number;
}

export interface Wallet {
  balance: number;
  held: number;
  available: number;
}

export interface Transaction {
  id: string;
  type: TxnType;
  amount: number;
  refType: string | null;
  refId: string | null;
  note: string | null;
  createdAt: string;
}

export interface TopupRequest {
  id: string;
  amount: number;
  method: 'card' | 'slip';
  slipUrl: string | null;
  status: RequestStatus;
  reason: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  customerId: string;
  chargerId: string;
  stationId: string;
  spendingLimit: number;
  kwh: number | null;
  cost: number | null;
  commission: number | null;
  status: SessionStatus;
  disputeReason: string | null;
  startedAt: string;
  endedAt: string | null;
}

export interface SessionWithNames extends Session {
  stationName: string;
  chargerLabel: string;
  connector: ConnectorType;
  powerKw: number;
  ratePerKwh: number;
  customerName: string;
  hasReview: boolean;
}

export interface Withdrawal {
  id: string;
  amount: number;
  bankNote: string;
  status: WithdrawalStatus;
  createdAt: string;
}

export interface Review {
  id: string;
  stationId: string;
  customerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  refId: string | null;
  read: boolean;
  createdAt: string;
}

export interface EarningsDay {
  day: string;
  earnings: number;
  commission: number;
  sessions: number;
}

export interface AdminCounts {
  pendingStations: number;
  pendingTopups: number;
  pendingWithdrawals: number;
  users: number;
}

export interface AdminStation extends Station {
  ownerName: string;
  chargerCount: number;
}

export interface AdminTopup extends TopupRequest {
  userName: string;
}

export interface AdminWithdrawal extends Withdrawal {
  ownerName: string;
}
```
