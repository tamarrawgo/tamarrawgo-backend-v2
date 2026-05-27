# TamarrawGo — Setup Guide

## Prerequisites
- Node.js v20+
- npm v10+
- Docker + Docker Compose
- Expo CLI (`npm install -g expo-cli`)
- Railway account (for deployment)
- Google Maps Platform API key
- Firebase project

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd "TamarrawGo V2"
npm install
```

---

## 2. Environment Configuration

```bash
cd backend/api-server
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_SECRET` — random 64-char string (use `openssl rand -hex 32`)
- `JWT_REFRESH_SECRET` — another random 64-char string
- `GOOGLE_MAPS_API_KEY` — from Google Cloud Console
- `FIREBASE_*` — from Firebase Console → Project Settings → Service Accounts

---

## 3. Start with Docker (Recommended)

```bash
# From project root
docker compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **API Server** on port 3000
- **Admin Dashboard** on port 3001

---

## 4. Start Without Docker (Development)

```bash
# Start PostgreSQL and Redis locally, then:

# Backend API
npm run dev:backend

# Admin Dashboard (new terminal)
npm run dev:admin
```

---

## 5. Database Setup

```bash
cd backend/api-server

# Run migrations
npm run prisma:migrate

# Seed initial data (admin user + fare config)
npm run prisma:seed

# View database (optional)
npm run prisma:studio
```

**Default Admin Credentials:**
- Phone: `+639000000000`
- Password: `Admin@1234`

---

## 6. Mobile Apps Setup

### Passenger App

```bash
cd apps/passenger-app
npm install

# Create .env
echo "EXPO_PUBLIC_API_URL=http://YOUR_IP:3000/api/v1" > .env
echo "EXPO_PUBLIC_SOCKET_URL=http://YOUR_IP:3000" >> .env

npx expo start
```

### Rider App

```bash
cd apps/rider-app
npm install
npx expo start
```

> **Important:** Replace `YOUR_IP` with your machine's local IP (not `localhost`) when testing on a physical device.

---

## 7. Google Maps Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable these APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API
   - Geocoding API
   - Directions API
3. Create an API key and restrict it to your app
4. Add to `backend/api-server/.env` and `apps/passenger-app/app.json`

---

## 8. Firebase Setup (Push Notifications)

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add Android and iOS apps
3. Download `google-services.json` → `apps/passenger-app/`
4. Download `GoogleService-Info.plist` → `apps/passenger-app/`
5. Get service account credentials → add to `.env`

---

## 9. Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway new

# Add PostgreSQL and Redis plugins in Railway dashboard

# Set environment variables in Railway dashboard, then:
railway up
```

---

## 10. API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:3000/api/docs`

---

## Architecture Overview

```
TamarrawGo V2/
├── apps/
│   ├── passenger-app/     # React Native (Expo) — Passenger
│   ├── rider-app/         # React Native (Expo) — Rider
│   └── admin-dashboard/   # React + Vite + TailwindCSS
├── backend/
│   └── api-server/        # NestJS REST API + Socket.IO
├── packages/
│   ├── shared-types/      # Shared TypeScript interfaces & enums
│   └── shared-utils/      # Fare calculation, geo utils, formatters
├── docker-compose.yml
├── railway.toml
└── .github/workflows/ci.yml
```

## Booking Flow

```
Passenger enters destination
    → Fare estimated (distance + time + surge)
    → Booking created (status: SEARCHING)
    → Nearby riders dispatched via Socket.IO + FCM
    → First rider accepts → status: ACCEPTED
    → Rider marks arrived → status: RIDER_ARRIVED
    → Rider starts trip → status: IN_PROGRESS
    → Rider completes → status: COMPLETED
    → Payment processed (80% to rider)
    → Passenger rates rider
```

## Fare Formula

```
Fare = (Base ₱40 + Distance × ₱15/km + Duration × ₱2/min) × Surge
Surge: Peak hours (7-9am, 5-8pm) = 1.5x | Night (10pm-5am) = 1.2x
Minimum fare: ₱50
```
