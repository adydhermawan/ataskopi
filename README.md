# ☕ AtasKopi - Coffee Shop Digital Ecosystem

AtasKopi is a comprehensive, integrated digital ecosystem designed for modern coffee shop businesses. The system comprises a **Web Dashboard (Admin & Cashier)** and a **Customer Order App (Mobile)**, both production-ready for scalable operations.

Built with a modern and portable **Own API** architecture, it allows for free deployment on Vercel/Supabase for startups, or seamless migration to private VPS for total data control.

🚀 **Status:** Production Ready v1.0
🌍 **Live Demo:** [ataskopi.dadi.web.id](https://ataskopi.dadi.web.id)
📱 **Android APK:** [Download Latest APK](https://ataskopi.dadi.web.id/download/ataskopi-v1.apk) 
---

## 🏗️ Architecture Overview

- **Unified Backend:** Next.js 14+ (App Router) as a Monolith (handling UI & Backend API).
- **Database:** Standard PostgreSQL (Hosted via Supabase).
- **Mobile App:** Flutter (iOS & Android) - Fully integrated.
- **State Management:** Real-time data sync using Supabase Realtime across all clients.

```
┌─────────────────┐       ┌─────────────────────────┐       ┌─────────────────┐
│   Mobile App    │ ────▶ │   Next.js Monolith API   │ ────▶ │   PostgreSQL    │
│    (Flutter)    │ ◀──── │   (ataskopi_admin)      │ ◀──── │   (Supabase)    │
└─────────────────┘       └─────────────────────────┘       └─────────────────┘
                                      ▲
                                      │
                          ┌─────────────────────────┐
                          │     Web Admin UI        │
                          │   (Next.js Dashboard)   │
                          └─────────────────────────┘
```

---

## 📁 Project Structure

```
ataskopi/
├── ataskopi_admin/     # Web Admin, Cashier Dashboard & Backend API (Next.js)
├── ataskopi_frontend/  # Customer Mobile App (Flutter)
├── supabase/           # Database Schema, Migrations & Local Infra (Docker)
└── context.md          # Technical specifications & schema
```

---

## ✨ Key Features

### 📱 Customer Mobile App (Flutter)
A premium, native experience for customers to order and engage with the brand.

- **Smart Ordering Modes:**
  - **Dine-in:** Scan QR codes at tables for instant menu access and ordering without queuing.
  - **Pickup:** Schedule orders ahead of time to skip the line.
  - **Delivery:** Pinpoint location delivery using integrated OpenStreetMap (OSM).
- **Loyalty & Rewards:**
  - **Tier System:** Gamified progression (Bronze, Silver, Gold) based on points.
  - **Point Redemption:** Earn points per transaction and redeem them for discounts.
- **Real-Time Experience:**
  - **Live Tracking:** Visualize order status in real-time (Preparing ➔ Ready ➔ Delivered).
  - **Push Notifications:** Instant updates on order status and promo alerts.
- **Secure & Easy Auth:**
  - **PIN Security:** Quick 6-digit PIN access for returning users.
  - **Seamless Onboarding:** Phone number-based login/registration.

### 💻 Web Dashboard (Admin & Cashier)
- **POS / Kitchen Display:** Real-time incoming orders with audio alerts.
- **Menu Management:** Full control over products, variants, toppings, and stock.
- **Multi-Outlet Support:** Manage unlimited store locations from a single dashboard.
- **Business Analytics:** Sales reports, bestselling items, and customer retention metrics.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/) (For local DB)
- [Node.js 18+](https://nodejs.org/) (For Web/API)
- [Flutter SDK](https://docs.flutter.dev/get-started/install) (For Mobile App)

### 2. Setup Database (Supabase Local)
```bash
cd supabase
docker-compose up -d
```
*Default Ports:* API Gateway at `localhost:8001`, Database at `5432`.

### 3. Setup Web Admin & Backend API
```bash
cd ataskopi_admin
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for Admin/Cashier Dashboard.

### 4. Setup Mobile App (Flutter)
```bash
cd ataskopi_frontend
flutter pub get
flutter run
```
*Note:* To test the Mobile App on a physical device against localhost, use Cloudflare Tunnel (see below).

---

## 🌐 Connectivity for Mobile Testing
To test the Mobile App on a physical device with a local backend (bypassing public IP issues), use **Cloudflare Tunnel**:
1. Install `cloudflared`.
2. Run tunnel: `cloudflared tunnel --url http://localhost:8001`.
3. Update `SUPABASE_URL` in the Flutter app with the generated tunnel URL.

---

## 🛡️ Deployment Guide

### Web Admin & API
Ready for serverless deployment:
- **Vercel:** Recommended for ease of use. Simply connect your Git repo.
- **Docker:** Build using the `Dockerfile` in `ataskopi_admin` for VPS/Coolify.

### Database
- **Supabase Cloud:** Use the Free Tier to start. Sync local schema with `supabase db push`.

### Mobile App
- **Android:** `flutter build apk --release` (Output: `build/app/outputs/flutter-apk/app-release.apk`)
- **iOS:** `flutter build ipa --release`

---

## 🛠️ Step-by-Step Deployment Guide (Free Tier Option)

### 1. Database (Supabase Free Tier)
1.  Sign up at [Supabase](https://supabase.com/).
2.  Create a new project named `ataskopi`.
3.  Go to **Project Settings > Database** and copy the **Connection string** (Transaction mode).
4.  Password: Keep this safe; you'll need it for the `DATABASE_URL`.

### 2. Backend & Web Admin (Vercel Free Tier)
1.  Push your code to a **Public/Private Git Repo** (GitHub/GitLab).
2.  Log in to [Vercel](https://vercel.com/) and click **Add New > Project**.
3.  Import your repository.
4.  **Root Directory:** Set to `ataskopi_admin`.
5.  **Environment Variables:** Add the following:
    - `DATABASE_URL`: Your Supabase connection string.
    - `DIRECT_URL`: Your Supabase connection string (Session mode).
    - `NEXT_PUBLIC_SUPABASE_URL`: From Supabase API settings.
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: From Supabase API settings.
    - `NEXTAUTH_SECRET`: Generate a random string.
    - `NEXTAUTH_URL`: Your production URL (e.g., `https://ataskopi.dadi.web.id`).
6.  Click **Deploy**.

### 3. Initialize Database
Once deployed, run the following locally (pointing to your production DB) or via a CI/CD pipeline:
```bash
cd ataskopi_admin
npx prisma db push
```

### 4. Build & Distribute APK
1.  In `ataskopi_frontend`, update the API base URL in your configuration to point to your Vercel URL.
2.  Run `flutter build apk --release`.
3.  Upload the `.apk` file to your server or a file sharing service for distribution.

---

## 📝 License
Proprietary - AtasKopi Team.
