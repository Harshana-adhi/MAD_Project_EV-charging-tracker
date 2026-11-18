# EV Charging Point Tracker

A mobile app that connects EV drivers with charging point owners: live map and filters, QR-based charging sessions with a prepaid credit wallet, owner earnings and withdrawals, and admin verification. Built as a 2-day group project (INTE 22283, Mobile Application Development).

## Stack

- `mobile/` — React Native + Expo (Expo Router, TypeScript)
- `backend/` — Node.js + Express.js REST API (TypeScript) + Prisma
- Database: Supabase PostgreSQL (accessed only through Prisma)
- Real-time: Socket.io · Images: Cloudinary · Map: Leaflet + OpenStreetMap

## Setup

### Backend

```
cd backend
npm ci
cp .env.example .env   # fill in your Supabase pooler URLs and JWT secret
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

API runs on port 4000. Check `http://localhost:4000/api/v1/health`.

### Mobile

```
cd mobile
npm ci
cp .env.example .env   # set EXPO_PUBLIC_API_URL to your laptop's Wi-Fi IP
npx expo start
```

Scan the QR code with Expo Go on a phone on the same Wi-Fi.

Seeded demo accounts (password `Password123`): `admin@evct.lk`, `owner@evct.lk`, `customer@evct.lk`.

## Branching

- `main` — protected, releases only
- `develop` — central integration branch (default)
- `feature/<name>` — one branch per functionality, from `develop`
- `fix/<name>` — bug fixes, from `develop`

All changes merge into `develop` through a pull request.

note:payments and all wallets are simulated