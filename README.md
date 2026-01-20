# ☕ AtasKopi - Coffee Shop Digital Ecosystem

AtasKopi adalah ekosistem digital terintegrasi untuk bisnis coffee shop yang mencakup **Admin & Kasir Dashboard (Web)** dan **Customer Order App (Mobile)**. 

Dibangun dengan arsitektur **Own API** yang modern dan portabel, memungkinkan deployment gratis di Vercel/Supabase atau migrasi mudah ke VPS pribadi menggunakan standard PostgreSQL.

---

## 🏗️ Architecture Overview

- **Unified Backend:** Next.js 14 (App Router) as a Monolith (handling UI & Backend API).
- **Database:** Standard PostgreSQL (Hosted via Supabase).
- **Mobile App:** Flutter (iOS & Android).
- **State Management:** Real-time data sync using Supabase Realtime.

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
├── ataskopi_admin/     # Web Admin & Backend API (Next.js)
├── ataskopi_frontend/    # Customer Mobile App (Flutter)
├── supabase/             # Local database & infra (Docker)
└── context.md            # Technical specifications & schema
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/)
- [Node.js 18+](https://nodejs.org/)
- [Flutter SDK](https://docs.flutter.dev/get-started/install)

### 2. Setup Database (Supabase Local)
```bash
cd supabase
docker-compose up -d
```
*Port default:* API Gateway di `localhost:8001`, Database di `5432`.

### 3. Setup Web Admin & Backend API
```bash
cd ataskopi_admin
npm install
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) untuk Dashboard.

### 4. Setup Mobile App (Flutter)
```bash
cd ataskopi_frontend
flutter pub get
flutter run
```

---

## 🌐 Connectivity for Mobile Testing
Untuk mengetes Mobile App ke backend lokal tanpa IP publik, gunakan **Cloudflare Tunnel**:
1. Pastikan `cloudflared` terinstall.
2. Jalankan tunnel ke backend: `cloudflared tunnel --url http://localhost:8001`.
3. Update `SUPABASE_URL` di Flutter app dengan URL tunnel yang didapat.

---

## 🛡️ Deployment
- **Web & API:** Deploy ke **Vercel** (Hobby Tier mencukupi).
- **Database:** Gunakan **Supabase Cloud** (Free Tier).
- **Static Assets:** Supabase Storage (S3 Compatible).

---

## 📝 License
Proprietary - AtasKopi Team.
