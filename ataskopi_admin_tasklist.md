# 🏗️ AtasKopi Web Admin - Development Tasklist

**Project:** AtasKopi Web Admin & Kasir Dashboard  
**Started:** 2026-01-20  
**Last Updated:** 2026-01-20  

---

## 📊 Progress Overview

| Package | Status | Progress |
|---------|--------|----------|
| Package 0: DevOps Setup | 🔄 In Progress | 2/8 |
| Package A: API Foundation | ⏳ Not Started | 0/3 |
| Package B: Admin UI Foundation | ⏳ Not Started | 0/4 |
| Package C: Live Order Queue | ⏳ Not Started | 0/5 |
| Package D: Product Management | ⏳ Not Started | 0/5 |
| Package E: Dashboard Analytics | ⏳ Not Started | 0/4 |
| Package G: Loyalty & Voucher | ⏳ Not Started | 0/4 |
| Package H: Outlet & Settings | ⏳ Not Started | 0/3 |
| Package I: Customer API (Mobile) | ⏳ Not Started | 0/5 |

**Legend:** ⏳ Not Started | 🔄 In Progress | ✅ Completed | ❌ Blocked

---

## 🏛️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE (Hosted via Supabase)           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │PostgreSQL│  │ GoTrue   │  │ Storage  │                       │
│  │(Database)│  │ (Auth DB)│  │ (Images) │                       │
│  └──────────┘  └──────────┘  └──────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Standard SQL / ORM (Prisma/Drizzle)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ataskopi_admin (Next.js 14 Monolith)           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    API LAYER (/app/api/*)                │   │
│  │  - Auth Handlers (Login/Register)                        │   │
│  │  - Business Logic (Orders/Products/Loyalty)              │   │
│  │  - Validation (Zod)                                      │   │
│  │  - Response Standardization                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│         ┌────────────────────┴────────────────────┐             │
│         ▼                                         ▼             │
│  ┌─────────────────┐                    ┌─────────────────┐     │
│  │   ADMIN UI      │                    │   MOBILE APP    │     │
│  │ (Next.js Page)  │                    │ (Flutter Http)  │     │
│  └─────────────────┘                    └─────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 👥 Role-Based Access Matrix

| Feature/Page | Owner | Admin | Kasir |
|--------------|:-----:|:-----:|:-----:|
| Dashboard Analytics | ✅ | ✅ | ❌ |
| Revenue Reports | ✅ | ✅ | ❌ |
| Product Management | ✅ | ✅ | ❌ |
| Category Management | ✅ | ✅ | ❌ |
| Voucher Management | ✅ | ✅ | ❌ |
| Loyalty Settings | ✅ | ✅ | ❌ |
| User Management | ✅ | ✅ | ❌ |
| Staff Management | ✅ | ❌ | ❌ |
| Outlet Settings | ✅ | ✅ | ❌ |
| Live Order Queue | ✅ | ✅ | ✅ |
| Update Order Status | ✅ | ✅ | ✅ |
| Payment Verification | ✅ | ✅ | ✅ |
| Order History (View) | ✅ | ✅ | ✅ |

---

## 🔶 PACKAGE 0: DevOps & Environment Setup

> **Estimasi:** 1-2 hari  
> **Status:** 🔄 In Progress

### Checklist:
- [ ] **0.1 GitHub Repository**
  - [ ] Create repository `ataskopi_admin`
  - [ ] Initialize with README
  - [ ] Setup branch protection on `main`
  - [ ] Create `develop` branch
- [ ] **0.2 Supabase Cloud Project (Production)**
  - [ ] Create project di supabase.com
  - [ ] Note down project URL & anon key
  - [ ] Run initial migrations
  - [ ] Setup RLS policies
  - [ ] Enable Realtime
- [/] **0.3 Supabase Local (Development)**
  - [x] Create `supabase/` folder dengan docker-compose
  - [x] Configure `.env` dengan secrets
  - [ ] Test `docker-compose up -d`
  - [ ] Verify all services running (db, auth, realtime, storage)
- [ ] **0.4 Cloudflare Tunnel (Development)**
  - [ ] Install `cloudflared` on Mac
  - [ ] Create tunnel `ataskopi-dev`
  - [ ] Configure `~/.cloudflared/config.yml`
  - [ ] Add DNS record: `devataskopi.dadi.web.id`
  - [ ] Test tunnel: `cloudflared tunnel run ataskopi-dev`
- [ ] **0.5 Vercel Setup (Production)**
  - [ ] Create Vercel project
  - [ ] Link to GitHub repository
  - [ ] Set Production branch: `main`
  - [ ] Add environment variables (Production)
  - [ ] Add custom domain: `ataskopi.dadi.web.id`
  - [ ] Verify SSL certificate
- [x] **0.6 Next.js Project Initialization**
  - [x] Run `npx create-next-app@latest ataskopi_admin`
  - [x] Install dependencies (supabase, shadcn, etc.)
  - [x] Create `.env.local` for development
  - [x] Create `.env.example` for reference
- [ ] **0.7 GitHub Actions CI**
  - [ ] Create `.github/workflows/ci.yml`
  - [ ] Setup lint job
  - [ ] Setup type-check job
- [ ] **0.8 Initial Commit & Deploy**
  - [ ] Commit all changes to `develop`
  - [ ] Merge to `main`
  - [ ] Verify Vercel auto-deploy

---

## 🔶 PACKAGE A: API Foundation (Prioritas 1)

> **Estimasi:** 2-3 hari  
> **Status:** ⏳ Not Started

### Checklist:
- [ ] **A.1 API Structure Setup**
  - [ ] Standard Response Handler (`{ status, message, data }`)
  - [ ] Error Handling Middleware
  - [ ] Service Layer Pattern Setup
- [ ] **A.2 Database Connection (Portability Optimized)**
  - [ ] Setup ORM (Prisma/Drizzle) focusing on standard PostgreSQL
  - [ ] Avoid Supabase-exclusive SDK functions for business logic
  - [ ] Type definitions generation from standard Postgres schema
- [ ] **A.3 Auth API (`/api/auth/*`)**
  - [ ] `POST /login` (Phone/PIN or Email/Pass)
  - [ ] `POST /register`
  - [ ] `GET /me` (Verify session)
  - [ ] JWT Handling

---

## 🔷 PACKAGE B: Admin UI Foundation & Sidebar

> **Estimasi:** 1-2 hari  
> **Status:** ⏳ Not Started

### Checklist:
- [ ] **B.1 Sidebar Component**
  - [ ] Logo + tenant name
  - [ ] Navigation items dengan icons
  - [ ] Active state indicator
  - [ ] Collapse/expand functionality
  - [ ] Role-based menu filtering
- [ ] **B.2 Header Component**
  - [ ] User info + avatar
  - [ ] Role badge (Admin/Kasir)
  - [ ] Role switcher (jika punya multiple roles)
  - [ ] Notification bell (placeholder)
  - [ ] Logout button
- [ ] **B.3 Navigation Config**
  - [ ] Define `navItems` with roles
- [ ] **B.4 Protected Layout**
  - [ ] Implement middleware/HOC for auth check

---

## 🔷 PACKAGE C: Live Order Queue - Kasir (Prioritas 1)

> **Estimasi:** 3-4 hari  
> **Status:** ⏳ Not Started

### Checklist:
- [ ] **C.1 Order Queue Page (`/kasir`)**
  - [ ] Kanban-style columns (Pending → Preparing → Ready → Done)
  - [ ] Real-time updates via Supabase Realtime
  - [ ] Sound notification untuk order baru
- [ ] **C.2 Order Card Component**
  - [ ] Order ID + timestamp
  - [ ] Order type badge (Dine-in/Pickup/Delivery)
  - [ ] Customer name + table
  - [ ] Item summary (collapsed)
- [ ] **C.3 Order Detail Modal**
  - [ ] Full item list dengan variants + toppings
  - [ ] Customer notes
  - [ ] Payment info
- [ ] **C.4 Payment Verification**
  - [ ] Mark as Paid button
  - [ ] Confirmation dialog
  - [ ] Update `payment_status` di database
- [ ] **C.5 Status Update Flow**
  - [ ] Pending → [Accept] → Preparing → [Ready] → Ready → [Complete] → Done

---

## 🔷 PACKAGE D: Product Management - Admin (Prioritas 2)

> **Estimasi:** 3-4 hari  
> **Status:** ⏳ Not Started

### Checklist:
- [ ] **D.1 Product List Page (`/admin/products`)**
  - [ ] DataTable dengan sorting, filtering, pagination
  - [ ] Search by name
  - [ ] Filter by category
- [ ] **D.2 Product Form (Add/Edit)**
  - [ ] Form validation
  - [ ] Image upload (Supabase Storage)
  - [ ] Variants management (inline)
- [ ] **D.3 Category Management**
  - [ ] CRUD categories
  - [ ] Reorder categories
- [ ] **D.4 Toppings Management**
  - [ ] CRUD toppings
  - [ ] Price management

---

## 🔷 PACKAGE E: Dashboard Analytics - Admin (Prioritas 2)

> **Estimasi:** 2-3 hari  
> **Status:** ⏳ Not Started

### Checklist:
- [ ] **E.1 Dashboard Home (`/admin`)**
  - [ ] Summary cards (Revenue, Orders, Customers)
  - [ ] Revenue chart (last 7 days)
  - [ ] Top selling products
- [ ] **E.2 Reports Page**
  - [ ] Date range picker
  - [ ] Revenue breakdown
  - [ ] Export to CSV/Excel

---

## 🔷 PACKAGE F: User & Staff Management (Prioritas 3)

> **Estimasi:** 2-3 hari  
> **Status:** ⏳ Not Started

### Checklist:
- [ ] **F.1 Customer List**
  - [ ] DataTable customers
  - [ ] View customer detail & order history
- [ ] **F.2 Staff Management**
  - [ ] List staff (kasir, admin)
  - [ ] Add new staff & assign roles

---

## 🔷 PACKAGE G: Loyalty & Voucher System (Prioritas 3)

> **Estimasi:** 2-3 hari  
> **Status:** ⏳ Not Started

### Checklist:
- [ ] **G.1 Loyalty Settings**
  - [ ] Points per item & point value
  - [ ] Tier management
- [ ] **G.2 Voucher Management**
  - [ ] CRUD vouchers
  - [ ] Set discount type & validity
  - [ ] Target by membership tier

---

## 🔷 PACKAGE H: Outlet & Tenant Settings (Prioritas 3)

> **Estimasi:** 1-2 hari  
> **Status:** ⏳ Not Started

### Checklist:
- [ ] **H.1 Outlet Settings**
  - [ ] Outlet info & Operating hours
  - [ ] Table management & QR generation
- [ ] **H.2 Brand Settings**
  - [ ] Logo upload & Colors
  - [ ] Tax rate & Service fee

---

## 🔷 PACKAGE I: Customer API (Mobile Backend)

> **Estimasi:** 3-4 hari  
> **Status:** ⏳ Not Started

### Checklist:
- [ ] **I.1 Product Catalog API**
  - [ ] `GET /api/products` (with search/filter)
  - [ ] `GET /api/categories`
  - [ ] `GET /api/products/[id]`
- [ ] **I.2 Order Management API**
  - [ ] `POST /api/orders` (Checkout submission)
  - [ ] `GET /api/orders` (User order history)
  - [ ] `GET /api/orders/[id]` (Tracking)
- [ ] **I.3 Loyalty & Rewards API**
  - [ ] `GET /api/me/loyalty` (Points/Tier)
  - [ ] `GET /api/me/vouchers` (Available/My vouchers)
- [ ] **I.4 Account API**
  - [ ] `PATCH /api/me/profile` (Update info)
  - [ ] `GET /api/outlets` (Outlet selection)
- [ ] **I.5 Security & Validation**
  - [ ] RLS check for customer-owned data
  - [ ] Input validation (Zod) for order payloads

---

## 🐳 Local Development with Docker (macOS)

### Setup Commands:
```bash
# Terminal 1: Start Supabase stack
cd supabase
docker-compose up -d

# Terminal 2: Start Next.js dev server
cd ataskopi_admin
npm run dev -- -p 3001
```

---

## 🌐 Deployment Comparison

| Aspect | Vercel (Free) | DigitalOcean VPS |
|--------|---------------|------------------|
| Setup Time | 5 menit | 1-2 jam |
| Cost MVP | $0 | $12/bulan |
| Recommended | ✅ MVP Phase | Production Phase |

---

## 📝 References

- [Implementation Plan](file:///Users/adydhermawan/.gemini/antigravity/brain/0ac2caad-761c-425d-a3f2-02281e3dbed8/implementation_plan.md)
- [Project Context](file:///Users/adydhermawan/Projects/ataskopi/context.md)

---

*This file should be updated as work progresses.*
