# ☕ Coffee Shop & Resto Digital Ecosystem - Project Context

**Version:** 1.0 (Final Comprehensive Version)  
**Developer:** Ady Putra Dhermawan  
**Target Platforms:** Android, iOS, Mobile Web (Customer) & Desktop Web (Admin/Kasir)  
**Last Updated:** 2026-01-13

---

## 🎯 1. Project Overview

Ekosistem aplikasi digital end-to-end yang mentransformasi operasional bisnis F&B tradisional menjadi sistem modern yang efisien dan berorientasi pada pelanggan. Project ini menghubungkan tiga pilar utama dalam satu integrasi database real-time:

1. **Pelanggan (Customer)** - Mobile App untuk pemesanan
2. **Staf Operasional (Kasir/Barista)** - Web Dashboard untuk manajemen pesanan
3. **Pemilik Bisnis (Admin/Owner)** - Web Dashboard untuk manajemen bisnis

### Filosofi Produk: "The 3-Click Experience"

Fokus utama adalah meminimalisir hambatan antara keinginan pelanggan dan pemenuhan pesanan. Pelanggan dapat menyelesaikan pesanan hanya dalam **tiga langkah utama**:

1. **Pilih metode** (Dine-in, Pickup, atau Delivery)
2. **Kustomisasi menu** (Varian, Toppings, Notes)
3. **Pembayaran digital** (QRIS)

---

## 🛠 2. Tech Stack

### Mobile App (Customer)
- **Framework:** Flutter
- **Target:** Android, iOS, Mobile Web (Responsive)
- **State Management:** Riverpod atau Provider (Reactive UI)
- **Design System:** Custom UI (Primary Blue: #1250a5, Accent Gold: #ffb400), Poppins/Inter Font, 16px Border Radius
- **Security:** PIN 6-digit untuk autentikasi cepat

### Web Dashboard & API (Backend Monolith)
- **Framework:** Next.js 14+ (App Router)
- **UI Components:** Shadcn/UI + Tailwind CSS
- **Role:** Melayani Admin Panel (UI) dan Mobile App (API)
- **Deployment:** Vercel (Unified Deployment)
- **Architecture:** Monolith (Frontend + Backend in one repo)

### Backend Services (Portability Focused)
- **Primary Database:** PostgreSQL (Hosted via Supabase)
- **Portability Goal:** Codebase treats Supabase strictly as a standard PostgreSQL database to allow seamless migration to any VPS with a vanilla PostgreSQL instance.
- **ORM/Query Builder:** Prisma or Drizzle (Recommended for portability)
- **Auth Provider:** Supabase GoTrue (Open-source, replaceable)
- **Storage:** Supabase Storage (S3 Compatible, replaceable)
- **Realtime:** Supabase Realtime (Open-source extension)

### Local Development Environment
- **Docker:** Supabase services (Mac Docker)
- **Tunneling:** Cloudflare Tunnel for exposed local API

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE (Database Only)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │PostgreSQL│  │ GoTrue   │  │ Storage  │                       │
│  │(Database)│  │ (Auth DB)│  │ (Images) │                       │
│  └──────────┘  └──────────┘  └──────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ SQL / Service Role Key
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

## � 3. White Labeling Architecture

### Multi-Tenant Strategy

**Tenant Isolation Level:** Database-level (Shared Database, Isolated Schema)

Setiap tenant memiliki:
- **Unique Tenant ID** (slug format: `ataskopi-demo`, `cafe-jakarta`)
- **Dedicated Subdomain** (`ataskopi-demo.ataskopi.com`)
- **Isolated Data** (RLS - Row Level Security di Supabase)
- **Custom Branding** (logo, colors, fonts, splash screen)

### Brand Configuration System

#### A. Tenant Registration Flow

**Super Admin Dashboard:**
1. Create new tenant → Generate tenant_id
2. Configure brand settings (nama, logo, warna)
3. Setup initial admin user untuk tenant
4. Generate mobile app build (automated CI/CD)
5. Deploy tenant-specific subdomain

#### B. Brand Customization Options

**Visual Identity:**
```json
{
  "tenant_id": "ataskopi-demo",
  "brand_name": "AtasKopi Demo",
  "logo_url": "https://cdn.ataskopi.com/tenants/ataskopi-demo/logo.png",
  "splash_screen_url": "https://cdn.ataskopi.com/tenants/ataskopi-demo/splash.png",
  "app_icon_url": "https://cdn.ataskopi.com/tenants/ataskopi-demo/icon.png",
  "primary_color": "#124fa5",
  "secondary_color": "#FFFFFF",
  "accent_color": "#ffb400",
  "font_family": "Poppins",
  "border_radius": 16
}
```

**Operational Settings:**
```json
{
  "business_name": "AtasKopi Demo",
  "business_type": "coffee_shop",
  "currency": "IDR",
  "tax_rate": 10,
  "service_fee": 5000,
  "loyalty_enabled": true,
  "delivery_enabled": true,
  "pickup_enabled": true,
  "dine_in_enabled": true,
  "payment_methods": ["qris", "cash", "gopay"],
  "operating_hours": {
    "monday": {"open": "08:00", "close": "22:00"},
    "tuesday": {"open": "08:00", "close": "22:00"}
  }
}
```

**Feature Toggles:**
```json
{
  "features": {
    "loyalty_system": true,
    "voucher_system": true,
    "table_reservation": false,
    "pre_order": true,
    "reviews": true,
    "push_notifications": true,
    "analytics": true
  }
}
```

### C. Mobile App Generation

> [!NOTE]
> **MVP Implementation (Phase 1):** Single base app dengan **tenant selector** di development mode. Production build menggunakan hardcoded `tenant_id` via build-time variable.

**Build Variants:**
- **Development:** Single app dengan tenant selector dropdown
- **Production (MVP):** Hardcoded tenant_id per build

**MVP Build Process:**
1. Set tenant_id via environment variable
2. Build APK/IPA dengan tenant config
3. Manual upload ke Play Store/App Store

**Flutter Configuration (MVP):**
```dart
// lib/config/tenant_config.dart
class TenantConfig {
  // Development: Allow tenant selection
  // Production: Hardcoded via build-time variable
  static const String tenantId = String.fromEnvironment(
    'TENANT_ID',
    defaultValue: 'demo', // For development
  );
}

// Build command (Production)
flutter build apk --dart-define=TENANT_ID=ataskopi-demo
```

**Development Mode - Tenant Selector:**
```dart
// Show tenant selector di login screen (development only)
if (kDebugMode) {
  DropdownButton<String>(
    value: selectedTenant,
    items: ['demo', 'ataskopi-demo', 'cafe-jakarta']
        .map((t) => DropdownMenuItem(value: t, child: Text(t)))
        .toList(),
    onChanged: (tenant) => setState(() => selectedTenant = tenant),
  );
}
```

---

> [!IMPORTANT]
> **Phase 3 Enhancement:** Automated build pipeline dengan GitHub Actions untuk generate per-tenant app otomatis. Lihat implementation_plan.md untuk detail.

### D. Web Dashboard Deployment

**Subdomain Strategy:**
- Customer App: `app.ataskopi-demo.ataskopi.com`
- Admin Dashboard: `admin.ataskopi-demo.ataskopi.com`
- Kasir Dashboard: `kasir.ataskopi-demo.ataskopi.com`

**Tenant Detection:**
```javascript
// Next.js middleware
export function middleware(request) {
  const hostname = request.headers.get('host');
  const tenant = hostname.split('.')[0]; // Extract subdomain
  
  // Inject tenant context
  request.headers.set('x-tenant-id', tenant);
}
```

### E. Data Isolation Strategy

**Row Level Security (RLS) Policies:**
```sql
-- Example: Products table
CREATE POLICY "Tenant isolation" ON products
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::text);

-- Set tenant context per request
SET app.current_tenant = 'ataskopi-demo';
```

### Role-Based Access Matrix

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

### API Request Flow
1. Client (Mobile/Web) sends HTTP Request ke `https://ataskopi.dadi.web.id/api/*`
2. Next.js Middleware memvalidasi Session/JWT
3. Middleware extract `tenant_id` dari subdomain atau header
4. API Route Handler menjalankan business logic (validasi harga, stok, dll)
5. API Route Handler query database via Supabase Client (Service Role)
6. Response dikembalikan ke client dalam format JSON standar


---

## �🏗 4. Core Business Logic

### A. Authentication & Security

**Flow:**
1. **Onboarding:** 3 Slides walkthrough (Order, Promo, Poin)
2. **Login/Register:**
   - Phone number & password
   - Login with Google
3. **Security:** PIN 6-digit sebagai password utama untuk akses cepat

**Trigger Logic:**
- First install atau belum login → Walkthrough
- HP baru → Form Daftar
- HP lama → Login dengan PIN
- Lupa PIN → Reset via Hubungi Admin / Customer Service

### B. Loyalty & Leveling System (MVP - Simplified)

**1. Point Earning Mechanism:**
- **Method:** Per Item Purchased (Default).
- **Setting:** `points_per_item` (Configurable, Default: 1).
- **Contoh:** Beli 5 item = 5 poin.

**2. Point Redemption Value:**
- **Redeem at Checkout:** Admin dapat mengatur nilai tukar poin saat checkout.
- **Setting:** 1 Point = Rp X.
- **Default:** 1 Point = Rp 1,000.
- **Minimum Redemption:** 10 points (Configurable).

**3. Membership Levels (3 Tiers):**

Admin dapat mengatur rentang poin dan nama tier melalui dashboard:

| Level | Default Name | Min Points | Max Points | Benefits |
|-------|--------------|------------|------------|----------|
| 1 | Bronze | 0 | 100 | Basic member |
| 2 | Silver | 100 | 500 | Tier-specific discount vouchers |
| 3 | Gold | 500+ | ∞ | Tier-specific discount vouchers |

**4. Tier-Based Promotions:**
- Admin dapat membuat **Voucher Promo** yang dibatasi hanya untuk kategori level tier tertentu (e.g., promo khusus Gold member).

**Admin Configuration (Web Dashboard):**
- Settings → Loyalty Program
- Form fields:
  - ✅ Point earning value (default: 1 per-item)
  - ✅ Point redemption value in IDR (default: 1000)
  - ✅ Minimum points to redeem (default: 10)
  - ✅ Tier Names & Point Ranges
  - ✅ Enable/disable loyalty (toggle)

**Customer App UI:**
- Total Poin.
- Current Tier Name.
- Progress Bar ke tier berikutnya.
- Points needed untuk next tier.

---

### C. Order Management

**Order ID Format:**
```
[OutletID][DDMMYY]-[Sequence]
Contoh: 0001130126-001
```

**Order Modes:**

#### 1. Dine-in
- **Validation:** Wajib Scan QR Code Meja
- **Payment:** Static QRIS (Kasir manually cross-checks) atau Cash
- **Flow:** Scan QR → Menu → Checkout → Payment → Live Tracking
- **Status Progression:** Unpaid → Paid (Manual Check) → Prep → Done

#### 2. Pickup (Scheduled)
- **Validation:** Wajib pilih jam ambil (Min: current time + 20 menit)
- **Payment:** Static QRIS only (Manual verification by Kasir)
- **Flow:** Pilih Waktu → Menu → Checkout → Payment → Live Tracking
- **Status Progression:** Unpaid → Paid (Manual Check) → Prep → Ready → Done

#### 3. Delivery (MVP)
- **Validation:** Integrasi alamat GPS dengan OpenStreetMap (OSM Pin Drop)
- **Payment:** Static QRIS (Admin manually cross-checks payment)
- **Delivery Method:** Kasir order Gojek manual (MVP)
- **Radius:** Terbatas pada radius tertentu
- **Flow:** Pin Alamat → Menu → Checkout → Payment → Live Tracking
- **Status Progression:** Unpaid → Paid (Manual Check) → Prep → Waiting Pickup → OTW → Done

---

## 📱 5. Customer App - Screen Structure

### 0. ONBOARDING
**Section:** Walkthrough  
**Trigger:** First install atau belum login  
**Content:** 3 Slide informasi utama (Order, Promo, Poin)  
**UI Details:**
- Full screen illustration
- Title (Poppins Bold) & Description
- Pagination dots (animated)
- "Skip" (Top Right) & "Mulai" (Primary Button)

---

### 1. AUTHENTICATION FLOW (UNIFIED)
> 📐 **Design:** [Auth Entry](file:///Users/adydhermawan/Projects/ataskopi/design/login_/_register_entry/code.html) | [Registration](file:///Users/adydhermawan/Projects/ataskopi/design/login_/new_user_registration/code.html) | [PIN Security](file:///Users/adydhermawan/Projects/ataskopi/design/login_/pin_security_login_register/code.html)

**Logic:** Entry Point -> Check Phone Number -> Redirect to Login (PIN) OR Register (Data Diri).

#### Unified Entry Point
- **UI:** Welcome screen dengan logo, tagline, dan incentive badge ("Voucher 50%").
- **Action:** Input Nomor Ponsel (+62).
- **Control Logic:** 
  - Jika nomor terdaftar -> Route ke **PIN Security Login**.
  - Jika nomor baru -> Route ke **New User Registration**.

#### New User Registration (Data Diri)
- **UI:** Screen "Lengkapi Data Diri".
- **Fields:** 
  - Nomor Handphone (Read-only dengan icon lock).
  - Nama Lengkap (Wajib).
  - Email (Wajib).
- **Action:** "Lanjutkan" -> Route ke **PIN Security (Creation)**.

#### PIN Security (Shared Component)
- **Purpose:** Digunakan untuk Login (member lama) atau Pembuatan PIN (member baru).
- **UI Details:** 
  - Dynamic Greeting: "Halo, [Nama]!".
  - Circular Avatar dengan status indicator.
  - 6-dot PIN dots.
  - Custom Keypad (1-9, 0, Backspace).
  - Links: "Lupa PIN?", "Ganti Nomor HP".

---

### 2. HOME
> 📐 **Design:** [Home Dashboard](file:///Users/adydhermawan/Projects/ataskopi/design/final_coffee_shop_home_dashboard_1/code.html)

#### Section: Header & Featured
- User Tier Badge (backdrop-blur)
- Notification Icon (with red dot)
- **Featured Hero:** Image banner (Ice Matcha Coffee, etc.) with title overlay.

#### Section: Outlet Selection
- **Outlet Card (Sticky):** Menampilkan outlet aktif (misal: "Outlet Central Park"). Positioned statically in the scroll view (not floating) to ensure content visibility. Tap to open **Outlet Selection Modal**.

#### Section: Order Mode (Cards)
- **Pick Up:** Rounded-3xl card, "Skip the queue".
- **Delivery:** Rounded-3xl card, "Doorstep service".
- **Dine In:** Col-span-2 card (wide), "Reserve or order at table".

#### Section: Daily Curations
- **Recommendations:** Horizontal scrollable grid of products (Image, Add Button, Name, Price).

#### Section: Bottom Navigation
- Icons: Home, Orders, Rewards, Profile.

---

### 3. POP-UP VALIDATIONS
> 📐 **Design:** [Dine-in QR](file:///Users/adydhermawan/Projects/ataskopi/design/dine-in_qr_scanner_modal/code.html) | [Pickup Modal](file:///Users/adydhermawan/Projects/ataskopi/design/pickup_mode_modal%20/code.html) | [Delivery Address](file:///Users/adydhermawan/Projects/ataskopi/design/delivery_address_selection/code.html) | [Product Customizer](file:///Users/adydhermawan/Projects/ataskopi/design/product_customizer_modal/code.html)

#### Dine-in Validation
**Input:** Scan QR Code Meja  
**Trigger:** Klik "Dine-in" di Home

#### Pickup Time Selection (Modal)
**Trigger:** Klik "Pick Up" di Home
**Input:** 
- Date Picker ("Hari Ini" atau tanggal lain).
- Time Picker (Jam pengambilan).
- **Validation Note:** "Minimal 20 menit dari sekarang".
**UI:** Centered modal dengan backdrop blur.

#### Delivery Validation
**Input:** Map Pin (GPS Location)  
**Trigger:** Klik "Delivery" di Home

#### Product Customizer (Bottom Sheet Modal)
**Trigger:** Klik produk di katalog  
**Layout:** Header image, Product description, Option groups.
**Input Fields:**
- **Temperature (Wajib):** Hot / Ice (Radio buttons with icons).
- **Tambahan (Opsional):** Checkbox list (Extra Shot, Whipped Cream, Oat Milk Upgrade).
- **Catatan (Optional):** Textarea "Contoh: Kurangi gula, sedikit es...".
- **Stepper:** Bottom sticky bar dengan +/- buttons dan Real-time Subtotal.

#### Outlet Selection (Modal)
**Trigger:** Klik Outlet Card di Home
**Input:**
- Search Bar ("Cari outlet terdekat").
- **List:** Outlet Cards showing distance, address, and Open/Closed status.
- **Action:** Select outlet to update global tenant state.

---

### 4. MENU & CATALOG
> 📐 **Design:** [Menu Catalog](file:///Users/adydhermawan/Projects/ataskopi/design/menu_%26_catalog/code.html)

#### Section: Discovery
**Input:**
- Search Bar
- Category Tabs (Food/Drink)

#### Section: Product List
**View:** Product Card (Image, Name, Price)

#### Section: Floating Cart
**Trigger:** Muncul jika item > 0  
**UI Details:** Floating bar di bagian bawah dengan icon shopping bag, Badge count, Total harga, dan Button "Checkout".

---

### 5. CHECKOUT & PAYMENT
> 📐 **Design:** [Checkout Summary](file:///Users/adydhermawan/Projects/ataskopi/design/checkout_summary/code.html) | [Payment Method](file:///Users/adydhermawan/Projects/ataskopi/design/select_payment_method/code.html) | [QRIS Display](file:///Users/adydhermawan/Projects/ataskopi/design/payment_with_QRIS/code.html)

#### Section: Checkout Review
**View Fields:**
- **Pickup Location:** Outlet name & address info.
- **Order Summary:** List items with image, variants (e.g., Oat Milk), Qty, and individual price.
- **Voucher & Points:** 
  - Available points display.
  - **Redemption Toggle:** "Redeem X points for Rp Y".
- **Payment Detail:** Subtotal, Tax (PPN 11%), Point Discount, **Total Amount**.

#### Section: Select Payment Method
**Input:**
- List of methods: 
  - **QRIS (All Modes):** ShopeePay, GoPay, OVO, Dana.
  - **Tunai / Cash (Dine-in Only):** Pembayaran langsung di kasir.
- Security badge: "Pembayaran Aman & Terenkripsi".

#### Section: Payment Progress (QRIS Display)
**Integration:** QRIS Display  
**UI Details:**
- **Amount:** Total bayar besar.
- **QR Code:** QRIS image center.
- **Timer:** Expiry countdown (mm:ss).
- **Instructions:** Step-by-step (Screenshot, Buka App, Upload).
- **Actions:** "Unduh QR" (Primary) & "Saya Sudah Bayar" (Secondary text).
- **Cash Payment Flow:** Jika memilih Tunai (Dine-in), user langsung diarahkan ke **Activity Screen (Tab Aktif)** dengan status "Menunggu Pembayaran di Kasir".
- **Post-Payment Flow:** Setelah klik "Saya Sudah Bayar" (untuk QRIS), app mengarahkan user ke **Activity Screen (Tab Aktif)**. Status akan muncul sebagai "Menunggu Verifikasi Pembayaran" hingga dikonfirmasi manual oleh kasir.

---

### 6. ACTIVITY (TRACKING & HISTORY)
> 📐 **Design:** [Order Tracking](file:///Users/adydhermawan/Projects/ataskopi/design/Order%20ongoing%20detail/code.html) | [Order History](file:///Users/adydhermawan/Projects/ataskopi/design/Orders%20%26%20history/code.html)

#### Active Order Tracking
**Trigger:** Setelah bayar atau klik orderan aktif di tab Activity.
**UI Details:**
- **Status Stepper:** Paid → Preparing → Ready for Pickup → Done.
- **Progress Line:** Menampilkan status terkini dengan animasi pulsa pada status aktif.
- **Estimasi:** "Est. Time: 5 mins".
- **Info:** Order ID (#000xxx), Order Summary, dan Pickup Location card.

#### Order History (Tabbed View)
**Tabs:** "Aktif" & "Riwayat".
**UI Details:**
- **Order Cards:** ID Pesanan, Tanggal/Jam, Status Badge (Selesai/Dibatalkan).
- **Content:** List item singkat (e.g., "1x Flat White, 1x Avo Toast").
- **Footer:** Total Harga & Button "Order Lagi".

---

### 7. NOTIFICATIONS, REWARDS & PROFILE
> 📐 **Design:** [Notifications](file:///Users/adydhermawan/Projects/ataskopi/design/app_notifications_center/code.html) | [Rewards](file:///Users/adydhermawan/Projects/ataskopi/ataskopi_frontend/lib/features/home/presentation/screens/rewards_screen.dart) | [Edit Profile](file:///Users/adydhermawan/Projects/ataskopi/design/edit_user_profile/code.html)

#### Notifications Center
**Entry:** Bell icon on Home Header.
**Sections:** Hari Ini, Kemarin, Minggu Ini.
**UI Details:**
- **Notification Card:** [Icon], [Title], [Description], [Time], [Unread Dot].
- **Categories:** Transaksi, Promo, Info.
- **Status:** Unread indicator (Blue dot).

#### Rewards Screen
**Entry:** Bottom Navigation "Rewards".
**Header:** Gradient background, Total Points, Tier Status (Silver/Gold/Platinum).
**Content:**
- **Tier Progress:** Visual path connecting tiers.
- **Redeem Section:** List of rewards (e.g., "Diskon Rp 10.000") with point cost.
- **Actions:** "Tukar" button to redeem points.

#### Profile & Edit
**Entry:** Bottom Navigation "Profile".
**View:** Large Avatar (editable), Name, Phone, Member Badge.
**Menu:** Edit Profil, Alamat Tersimpan, Metode Pembayaran, Pengaturan, Bantuan.
**Edit Screen:**
- **Avatar:** Circular image with camera icon.
- **Inputs:** Nama Lengkap (Editable), Email (Editable), Phone (Locked).



---

## 🖥 6. Web Dashboard (Admin & Kasir)

### Role: Kasir

**Focus:** Live Order Management  
**Features:**
- **Live Order List:** Real-time pesanan masuk
- **Sound Notification:** Alert saat pesanan baru
- **Update Status:** Mark as Paid (Manual QRIS Cross-check) → Terima → Diproses → Siap
- **Order Detail View:** Detail pesanan lengkap

**Performance:**
- Next.js Server Components untuk loading instan
- TanStack Query untuk caching data pesanan

---

### Role: Admin

**Full Access:**
- **Laporan:** Revenue, Top Products, Customer Analytics
- **Manajemen Stok:** CRUD Products, Categories
- **Manajemen User:** Customer List, Kasir Management
- **Setting Outlet:** Outlet Info, Operating Hours
- **Promo & Voucher:** Create/Edit/Delete Campaigns
- **Loyalty Settings:** 
  - Configure Point Earning Rules (per item / percentage / per transaction)
  - Set Point Redemption Value (1 point = Rp X)
  - Manage Membership Tiers (add/edit/delete levels)
  - Set tier benefits and discount percentages
  - Enable/disable loyalty program

---

## 🗄 7. Database Schema (Supabase)

### Multi-Tenant Core Tables

#### `tenants`
```sql
- id (uuid, PK)
- tenant_slug (varchar, unique) -- URL-friendly: ataskopi-demo
- business_name (varchar)
- business_type (enum: 'coffee_shop', 'restaurant', 'cafe')
- subdomain (varchar, unique) -- ataskopi-demo.ataskopi.com
- status (enum: 'active', 'suspended', 'trial', 'cancelled')

- created_at (timestamp)
- updated_at (timestamp)
```

#### `brand_settings`
```sql
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants.id)
- brand_name (varchar)
- logo_url (text)
- splash_screen_url (text)
- app_icon_url (text)
- primary_color (varchar) -- Hex color
- secondary_color (varchar)
- accent_color (varchar)
- font_family (varchar)
- border_radius (int, default: 16)
- currency (varchar, default: 'IDR')
- tax_rate (decimal, default: 10)
- service_fee (decimal)
- operational_settings (jsonb) -- Operating hours, delivery radius, etc.
- feature_flags (jsonb) -- Enable/disable features per tenant
- created_at (timestamp)
- updated_at (timestamp)
```

#### `loyalty_settings`
```sql
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants.id, unique)
- is_enabled (boolean, default: true)
- points_per_item (int, default: 1)
- point_value_idr (decimal, default: 1000) -- 1 point = Rp X
- min_points_to_redeem (int, default: 10) -- Minimum points untuk bisa redeem
- max_points_per_transaction (int, nullable) -- Max points yang bisa dipakai per transaksi
- created_at (timestamp)
- updated_at (timestamp)
```

#### `membership_tiers`
```sql
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants.id)
- tier_level (int) -- 1, 2, 3, 4, 5
- tier_name (varchar) -- Bronze, Silver, Gold, Platinum, Diamond
- min_points (int) -- Minimum points untuk tier ini
- max_points (int, nullable) -- Maximum points (null untuk tier tertinggi)
- benefits_description (text) -- Deskripsi benefit
- created_at (timestamp)
- updated_at (timestamp)
- UNIQUE(tenant_id, tier_level)
```


#### `tenant_admins`
```sql
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants.id)
- user_id (uuid, FK -> users.id)
- role (enum: 'owner', 'admin', 'kasir')
- permissions (jsonb)
- created_at (timestamp)
```

### Tenant-Scoped Tables

#### `users`
```sql
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants.id) -- NEW: Tenant isolation
- phone (varchar)
- name (varchar)
- email (varchar, nullable)
- pin_hash (varchar)
- loyalty_points (int, default: 0)
- current_tier_id (uuid, FK -> membership_tiers.id, nullable) -- NEW: Reference to current tier
- total_items_purchased (int, default: 0)
- total_spent (decimal, default: 0) -- NEW: Total amount spent (for percentage-based points)
- created_at (timestamp)
- updated_at (timestamp)
- UNIQUE(tenant_id, phone) -- Phone unique per tenant
```

#### `outlets`
```sql
- id (varchar, PK) -- Format: 0001
- tenant_id (uuid, FK -> tenants.id) -- NEW: Tenant isolation
- name (varchar)
- address (text)
- latitude (decimal)
- longitude (decimal)
- operating_hours (jsonb)
- is_active (boolean)
- created_at (timestamp)
```

#### `tables`
```sql
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants.id) -- NEW: Tenant isolation
- outlet_id (varchar, FK)
- table_number (varchar)
- qr_code (text)
- is_occupied (boolean)
- created_at (timestamp)
```

#### `products`
```sql
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants.id) -- NEW: Tenant isolation
- name (varchar)
- description (text)
- category (enum: 'food', 'drink')
- base_price (decimal)
- image_url (text)
- is_available (boolean)
- is_recommended (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `product_variants`
```sql
- id (uuid, PK)
- product_id (uuid, FK)
- name (varchar) -- Hot, Ice
- price_modifier (decimal)
```

#### `toppings`
```sql
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants.id) -- NEW: Tenant isolation
- name (varchar)
- price (decimal)
- is_available (boolean)
```

#### `orders`
```sql
- id (varchar, PK) -- Format: [OutletID][DDMMYY]-[Seq]
- tenant_id (uuid, FK -> tenants.id) -- NEW: Tenant isolation
- user_id (uuid, FK)
- outlet_id (varchar, FK)
- order_type (enum: 'dine_in', 'pickup', 'delivery')
- table_id (uuid, FK, nullable) -- For dine-in
- scheduled_time (timestamp, nullable) -- For pickup
- delivery_address (jsonb, nullable) -- For delivery
- subtotal (decimal)
- tax (decimal)
- service_fee (decimal)
- delivery_fee (decimal, nullable)
- discount (decimal)
- points_used (int)
- total (decimal)
- payment_method (enum: 'qris', 'cash')
- payment_status (enum: 'pending', 'paid', 'failed')
- order_status (enum: 'pending', 'preparing', 'ready', 'waiting_pickup', 'on_the_way', 'completed', 'cancelled')
- created_at (timestamp)
- updated_at (timestamp)
```

#### `order_items`
```sql
- id (uuid, PK)
- order_id (varchar, FK)
- product_id (uuid, FK)
- variant_id (uuid, FK, nullable)
- quantity (int)
- unit_price (decimal)
- notes (text, nullable)
- created_at (timestamp)
```

#### `order_item_toppings`
```sql
- id (uuid, PK)
- order_item_id (uuid, FK)
- topping_id (uuid, FK)
- quantity (int)
- unit_price (decimal)
```

#### `loyalty_transactions`
```sql
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants.id)
- user_id (uuid, FK -> users.id)
- order_id (varchar, FK -> orders.id, nullable) -- Null jika manual adjustment
- transaction_type (enum: 'earned', 'redeemed', 'expired', 'adjusted')
- points_change (int) -- Positive untuk earned, negative untuk redeemed
- points_balance_after (int) -- Snapshot balance setelah transaksi
- earning_method (varchar, nullable) -- 'per_item', 'percentage', 'per_transaction'
- calculation_details (jsonb) -- Store calculation: {amount: 100000, percentage: 3, points: 3000}
- notes (text, nullable)
- expires_at (timestamp, nullable) -- Untuk points yang ada expiry
- created_at (timestamp)
```

#### `vouchers`
```sql
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants.id) -- NEW: Tenant isolation
- code (varchar)
- description (text)
- discount_type (enum: 'percentage', 'fixed')
- discount_value (decimal)
- min_purchase (decimal)
- max_discount (decimal, nullable)
- valid_from (timestamp)
- valid_until (timestamp)
- usage_limit (int, nullable)
- used_count (int, default: 0)
- is_active (boolean)
- target_membership_tier_id (uuid, FK -> membership_tiers.id, nullable) -- NEW: Filter voucher by tier
- UNIQUE(tenant_id, code) -- Code unique per tenant
- created_at (timestamp)
- updated_at (timestamp)
```

#### `notifications`
```sql
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants.id) -- NEW: Tenant isolation
- user_id (uuid, FK)
- category (enum: 'transaction', 'promo', 'loyalty', 'info')
- title (varchar)
- message (text)
- is_read (boolean, default: false)
- created_at (timestamp)
```

#### `promos`
```sql
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants.id) -- NEW: Tenant isolation
- title (varchar)
- description (text)
- banner_url (text)
- link_url (text, nullable)
- is_active (boolean)
- display_order (int)
- created_at (timestamp)
- updated_at (timestamp)
```

---

## 📦 8. Development Workflow

### Docker Configuration

**File:** `docker-compose.yml`

**Services:**
- PostgreSQL (Database)
- GoTrue (Auth)
- PostgREST (API)
- Realtime (WebSocket)
- Storage (File Upload)

**Volume Management:**
- Data volumes **TIDAK** di-push ke GitHub
- Gunakan `.gitignore` yang ketat

---

### Cloudflare Tunnel Configuration

**Purpose:** Mengekspos localhost ke internet untuk testing di real device

**Setup:**
1. Install `cloudflared`
2. Authenticate dengan Cloudflare account
3. Create tunnel: `cloudflared tunnel create coffee-api`
4. Configure tunnel: Edit `~/.cloudflared/config.yml`
5. Run tunnel: `cloudflared tunnel run coffee-api`

**Environment Variables:**
```env
# Flutter .env
API_BASE_URL=https://api-coffee.yourdomain.com

# Next.js .env.local
NEXT_PUBLIC_API_URL=https://api-coffee.yourdomain.com
```

**CRITICAL RULES:**
- ❌ JANGAN gunakan `localhost` atau `127.0.0.1`
- ✅ SELALU gunakan domain Cloudflare Tunnel
- ✅ Gunakan `EnvConfig` class untuk URL management

---

### GitHub Workflow

**Branch Strategy:**
- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - Feature branches

**Commit Guidelines:**
- Use conventional commits (feat, fix, docs, style, refactor, test, chore)
- Write clear, descriptive commit messages

**Files to Ignore:**
```gitignore
# Environment
.env
.env.local
.env.production

# Docker
docker-compose.override.yml
volumes/

# Flutter
build/
.flutter-plugins
.flutter-plugins-dependencies

# Next.js
.next/
out/
```

---

### Migration Management

**Location:** `/supabase/migrations`

**Naming Convention:**
```
YYYYMMDDHHMMSS_description.sql
```

**Best Practices:**
- Selalu buat migration untuk perubahan schema
- Test migration di local sebelum push
- Sinkronisasi antara local Docker dan production

---

## 🎨 9. Design System

> [!IMPORTANT]
> **White Label Note:** Semua nilai design system di bawah adalah **default values**. Setiap tenant dapat meng-override warna, font, dan border radius melalui `brand_settings` table. Aplikasi harus load konfigurasi tenant saat startup dan apply theming secara dinamis.

### Color Palette

**Primary (Blue) - Default:**
- `#124fa5` - Main brand color (Primary Blue)
- `#1565c0` - Lighter variant
- `#0d3d7f` - Darker variant

**Base (White & Neutrals) - Default:**
- `#FFFFFF` - Background
- `#F5F5F5` - Light background
- `#E0E0E0` - Border/Divider
- `#212121` - Text primary
- `#757575` - Text secondary

**Accent (Gold) - Default:**
- `#ffb400` - Gold accent (untuk highlights, badges, premium features)
- `#ffc933` - Lighter gold
- `#cc9000` - Darker gold

**Semantic Colors:**
- `#4CAF50` - Success (Green)
- `#F44336` - Error (Red)
- `#FF9800` - Warning (Orange)
- `#2196F3` - Info (Light Blue)

### Typography

**Font Family:**
- Primary: Inter (Google Fonts)
- Fallback: System UI

**Font Sizes:**
- H1: 32px
- H2: 24px
- H3: 20px
- Body: 16px
- Caption: 14px
- Small: 12px

### Spacing

**Base Unit:** 4px

**Scale:**
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

### Border Radius

**Standard:** 16px (untuk semua card, button, input)

---

### 🧩 Reusable Components (Flutter Widgets)

> [!NOTE]
> **Hybrid Approach:** Komponen di bawah ini WAJIB dibuat sebagai widget reusable. AI dapat menambahkan komponen lain di luar daftar ini jika menemukan pola berulang selama implementasi.

#### Buttons
| Component | File | Usage | Variants |
|---|---|---|---|
| `PrimaryButton` | `shared/widgets/buttons/primary_button.dart` | CTA utama (Lanjutkan, Bayar, Checkout) | Default, Loading, Disabled |
| `SecondaryButton` | `shared/widgets/buttons/secondary_button.dart` | Action sekunder | Outline, Ghost |
| `IconButton` | `shared/widgets/buttons/app_icon_button.dart` | Back, Close, Add, Notification | Rounded, Square |
| `SocialAuthButton` | `shared/widgets/buttons/social_auth_button.dart` | Google Sign-in | - |

#### Cards
| Component | File | Usage |
|---|---|---|
| `ProductCard` | `shared/widgets/cards/product_card.dart` | Item di menu catalog |
| `OrderModeCard` | `shared/widgets/cards/order_mode_card.dart` | Dine-in, Pickup, Delivery di Home |
| `OrderSummaryCard` | `shared/widgets/cards/order_summary_card.dart` | Item di checkout & history |
| `PromoCard` | `shared/widgets/cards/promo_card.dart` | Banner promo di carousel |
| `NotificationCard` | `shared/widgets/cards/notification_card.dart` | Item di notification center |

#### Inputs
| Component | File | Usage |
|---|---|---|
| `PhoneInput` | `shared/widgets/inputs/phone_input.dart` | Login dengan +62 prefix |
| `PinInput` | `shared/widgets/inputs/pin_input.dart` | 6-digit PIN (dots + keypad) |
| `SearchInput` | `shared/widgets/inputs/search_input.dart` | Search bar dengan icon |
| `TextFormInput` | `shared/widgets/inputs/text_form_input.dart` | Name, Email, Notes input |
| `QuantityStepper` | `shared/widgets/inputs/quantity_stepper.dart` | +/- stepper untuk qty |

#### Modals & Sheets
| Component | File | Usage |
|---|---|---|
| `AppBottomSheet` | `shared/widgets/modals/app_bottom_sheet.dart` | Base bottom sheet modal |
| `ProductCustomizerSheet` | `features/menu/widgets/product_customizer_sheet.dart` | Customizer modal |
| `PickupTimeSheet` | `features/checkout/widgets/pickup_time_sheet.dart` | Date & time picker |
| `ConfirmDialog` | `shared/widgets/modals/confirm_dialog.dart` | Confirmation popups |

#### Status & Feedback
| Component | File | Usage |
|---|---|---|
| `StatusStepper` | `shared/widgets/status/status_stepper.dart` | Order tracking progress |
| `StatusBadge` | `shared/widgets/status/status_badge.dart` | Paid, Preparing, Done pills |
| `TierBadge` | `shared/widgets/status/tier_badge.dart` | Bronze, Silver, Gold badge |
| `LoadingOverlay` | `shared/widgets/feedback/loading_overlay.dart` | Full screen loading |
| `SkeletonLoader` | `shared/widgets/feedback/skeleton_loader.dart` | Placeholder saat fetch data |

#### Navigation
| Component | File | Usage |
|---|---|---|
| `AppBottomNavBar` | `shared/widgets/navigation/app_bottom_nav_bar.dart` | Home, Orders, Rewards, Profile |
| `AppAppBar` | `shared/widgets/navigation/app_app_bar.dart` | Custom app bar dengan back button |
| `CategoryTabs` | `shared/widgets/navigation/category_tabs.dart` | Tab filter (Food, Drink, Promo) |

#### Layout
| Component | File | Usage |
|---|---|---|
| `FloatingCartBar` | `shared/widgets/layout/floating_cart_bar.dart` | Cart preview di menu screen |
| `SectionHeader` | `shared/widgets/layout/section_header.dart` | Title dengan "Lihat Semua" link |

## 🖼️ 11. Asset & Icon Management

### Icon Strategy (Frontend)

Untuk menjaga konsistensi visual, **AtasKopi** menggunakan **Lucide Icons** sebagai library utama dan **SVG** untuk logo atau ilustrasi kompleks.

> [!TIP]
> **Best Practice:** Jangan menggunakan `LucideIcons.home` langsung di UI. Gunakan class `AppIcons` untuk memetakan icon secara semantik. Ini memudahkan rebranding atau penggantian library icon di masa depan.

#### Semantic Icon Mapping
| Category | Semantic Name | Lucide Icon | Usage |
|---|---|---|---|
| **Navigation** | `home` | `home` | Bottom Nav Home |
| | `activity` | `history` | Bottom Nav Activity |
| | `rewards` | `gift` | Bottom Nav Rewards/Loyalty |
| | `profile` | `user` | Bottom Nav Profile |
| **Actions** | `back` | `arrow_left` | App Bar Back Button |
| | `close` | `x` | Modal/Search Close |
| | `search` | `search` | Search Bars |
| | `add` | `plus` | Add to Cart |
| | `remove` | `minus` | Decrement Quantity |
| | `scan` | `qr_code` | Dine-in Scan Button |
| **Status** | `notification` | `bell` | Header Notification Icon |
| | `success` | `check_circle_2` | Payment/Order Success |
| | `error` | `alert_circle` | Validation/Error Messages |
| | `clock` | `clock` | Estimated Time / History |
| | `delivery` | `truck` | Delivery Option Icon |
| | `pickup` | `shopping_bag` | Pickup Option Icon |
| | `dine_in` | `utensils` | Dine-in Option Icon |
| | `location` | `map_pin` | Map/Address Picker |
| **Branding** | `google` | `assets/icons/google.svg` | Google Login Button |
| | `qris_logo` | `assets/icons/qris.svg` | Payment Display |

---

### Backend Asset Strategy (Supabase Storage)

Untuk mendukung white-labeling, asset tidak bisa di-hardcode di binary app (kecuali placeholder). Backend harus mengelola asset secara dinamis.

#### 1. Storage Bucket Structure
Setiap tenant memiliki folder terisolasi di bucket `tenant-assets`:
- `tenants/{tenant_id}/branding/logo.png` (Transparan, resolusi tinggi)
- `tenants/{tenant_id}/branding/splash.png` (Full screen)
- `tenants/{tenant_id}/branding/app_icon.png` (Square)
- `tenants/{tenant_id}/promos/{promo_id}.webp` (Optimized banners)
- `tenants/{tenant_id}/products/{product_id}.webp` (Menu images)

#### 2. Optimization Workflow
- **Format:** Gunakan `.webp` untuk semua gambar produk dan banner guna menghemat bandwidth.
- **Sizing:** Lakukan resize otomatis di level backend/edge function sebelum upload (e.g., Thumbnail 300px, Hero 1200px).
- **CDN:** Aktifkan cache pada Supabase Storage CDN untuk asset yang jarang berubah.

#### 3. Dynamic Icons
Jika tenant ingin custom icon untuk menu (e.g., icon khusus untuk "Best Seller"), simpan URL icon tersebut di database table `brand_settings`.

---

### Brand Asset Specifications (White-labeling)

Setiap tenant wajib menyediakan asset berikut untuk proses rebranding otomatis:

| Asset | Format | Recommended Size | Usage |
|---|---|---|---|
| **Main Logo** | SVG / PNG | 512 x 512 px | Header, Login Screen |
| **App Icon** | PNG | 1024 x 1024 px | Launcher Icon (Android/iOS) |
| **Splash Screen** | PNG | 1242 x 2688 px | App Boot Sequence |
| **Favicon** | PNG | 64 x 64 px | Web Tab Icon |
| **Hero Banners** | JPG/WebP | 1200 x 600 px | Promo Carousel |

### Directory Structure
```text
assets/
├── icons/           # Brand icons (google.svg, qris.svg)
├── images/          # Static illustrations & placeholders
└── fonts/           # Inter & Poppins files
```

---

## 🔔 12. Notification System

### Push Notification Triggers

#### [TRANSAKSI]
- Order created → "Pesanan kamu sedang diproses"
- Status update → "Pesanan kamu sudah siap!"
- Order completed → "Terima kasih! Jangan lupa review"

#### [PROMO]
- New menu → "Menu baru: [Product Name]"
- Voucher expiring → "Voucher kamu akan hangus besok!"
- Flash sale → "Flash Sale! Diskon 50% hari ini"

#### [LOYALTY]
- Points earned → "Kamu dapat 5 poin!"
- Tier upgrade → "Selamat! Kamu naik ke Level 3"
- Points expiring → "1000 poin kamu akan hangus"

#### [INFO]
- New login → "Login baru terdeteksi"
- PIN changed → "PIN kamu berhasil diubah"
- Profile updated → "Profil kamu berhasil diperbarui"

---

## 🧪 11. Testing Strategy

### Unit Testing
- **Flutter:** Use `flutter_test` package
- **Next.js:** Use Jest + React Testing Library

### Integration Testing
- **API:** Postman/Insomnia collections
- **Database:** Supabase local testing

### E2E Testing
- **Mobile:** Flutter integration tests
- **Web:** Playwright or Cypress

### Performance Testing
- **Mobile:** Flutter DevTools
- **Web:** Lighthouse, Web Vitals

---

## 🚀 12. Deployment Strategy

### Mobile App
- **Android:** Google Play Store (Internal Testing → Beta → Production)
- **iOS:** App Store Connect (TestFlight → Production)
- **Web:** Vercel or Netlify

### Web Dashboard
- **Platform:** Vercel (recommended) or Netlify
- **Environment:** Production, Staging, Development

### Backend
- **Supabase:** Cloud-hosted (Production)
- **Docker:** Local development only

---

## 📝 13. AI Development Instructions

### Prioritas

1. **Multi-Tenant First:** SEMUA query database HARUS include `tenant_id` filter. JANGAN PERNAH query data tanpa tenant context
2. **Dynamic Theming:** UI HARUS load brand settings dari database, JANGAN hardcode warna/logo
3. **Reactive UI:** Jika data di Supabase berubah, UI Flutter dan Next.js harus berubah tanpa refresh
4. **Error Handling:** Setiap transisi (terutama PIN & Payment) harus memiliki loading state dan error popup yang jelas
5. **Consistency:** 
   - `camelCase` untuk Dart/JavaScript
   - `snake_case` untuk database

### White Labeling Rules

**CRITICAL - Data Isolation:**
```dart
// ❌ SALAH - Query tanpa tenant_id
final products = await supabase.from('products').select();

// ✅ BENAR - Selalu include tenant_id
final products = await supabase
  .from('products')
  .select()
  .eq('tenant_id', currentTenantId);
```

**CRITICAL - Dynamic Theming:**
```dart
// ❌ SALAH - Hardcoded color
Color primaryColor = Color(0xFF6F4E37);

// ✅ BENAR - Load dari brand settings
Color primaryColor = Color(
  int.parse(brandSettings.primaryColor.replaceFirst('#', '0xFF'))
);
```

**CRITICAL - Tenant Context:**
```javascript
// Next.js - Extract tenant dari subdomain
export function getTenantFromHost(host: string): string {
  return host.split('.')[0]; // ataskopi-demo.ataskopi.com -> ataskopi-demo
}

// Flutter - Load tenant dari config
class TenantConfig {
  static String tenantId = const String.fromEnvironment('TENANT_ID');
}
```

**CRITICAL - Loyalty System Configuration:**
```dart
// ❌ SALAH - Hardcoded loyalty calculation
int earnedPoints = totalItems; // 1 item = 1 point

// ✅ BENAR - Load dari loyalty_settings
final loyaltySettings = await supabase
  .from('loyalty_settings')
  .select()
  .eq('tenant_id', currentTenantId)
  .single();

int calculatePoints(Order order, LoyaltySettings settings) {
  if (!settings.isEnabled) return 0;
  return order.totalItems * settings.pointsPerItem;
}

// Auto-upgrade tier setelah points berubah
Future<void> checkAndUpgradeTier(String userId, int newPoints) async {
  final tiers = await supabase
    .from('membership_tiers')
    .select()
    .eq('tenant_id', currentTenantId)
    .order('min_points', ascending: true);
  
  // Find appropriate tier
  final newTier = tiers.lastWhere(
    (tier) => newPoints >= tier.minPoints && 
              (tier.maxPoints == null || newPoints < tier.maxPoints),
  );
  
  // Update user tier
  await supabase
    .from('users')
    .update({'current_tier_id': newTier.id})
    .eq('id', userId);
}
```

**CRITICAL - Maps & Location:**
- Gunakan **OpenStreetMap (OSM)** data providers (e.g., MapBox, Thunderforest, or default OSM tiles).
- **JANGAN** menggunakan Google Maps SDK/API untuk menghindari biaya API dan ketergantungan API Key.
- Implementasi di Flutter menggunakan package `flutter_map` (Leaflet equivalent).

**CRITICAL - URL Management:**
- Gunakan `EnvConfig` class untuk URL
- Ambil URL dari domain Cloudflare Tunnel
- **JANGAN** gunakan `localhost` atau `127.0.0.1`

### Docker Ready

- Susun `docker-compose.yml` yang optimal
- Pastikan semua service berjalan smooth di local
- Dokumentasikan setup di README

### CI/CD Mindset

- Struktur kode clean dan modular
- Siap untuk di-push ke GitHub
- Dokumentasi lengkap untuk kolaborasi

---

## 📊 14. Success Metrics

### Customer App
- **Time to Order:** < 3 menit (dari buka app hingga payment)
- **App Load Time:** < 2 detik
- **Crash Rate:** < 1%

### Web Dashboard
- **Order Processing Time:** < 30 detik (dari terima hingga update status)
- **Real-time Latency:** < 500ms
- **Uptime:** > 99.9%

### Business
- **Customer Retention:** > 60% (via Loyalty System)
- **Average Order Value:** Increase 20% (via Upselling)
- **Order Accuracy:** > 95%

---

## 🔐 15. Security Considerations

### Authentication
- PIN hashed dengan bcrypt
- Max login attempts: 5 (lock for 15 menit)

### Payment
- QRIS integration via trusted gateway
- No credit card data stored
- Transaction logs encrypted

### Data Privacy
- GDPR compliant
- User data anonymization option
- Clear privacy policy

---

## 📚 16. Documentation

### Required Docs
- [ ] README.md (Setup instructions)
- [ ] API Documentation (Swagger/OpenAPI)
- [ ] Database Schema Diagram
- [ ] User Manual (Customer App)
- [ ] Admin Manual (Web Dashboard)

---

## 🎯 17. Roadmap

### Phase 1: White Label Foundation (Current)
- [x] Multi-tenant architecture
- [x] Tenant isolation (RLS)
- [x] Brand customization system
- [x] Dynamic theming (mobile & web)
- [ ] Core order flow (Dine-in, Pickup, Delivery)
- [ ] Basic loyalty system
- [ ] QRIS payment
- [ ] Tenant admin dashboard
- [ ] Super admin dashboard

### Phase 2: Tenant Features
- [ ] Advanced analytics per tenant
- [ ] Automated delivery integration (Biteship API)
- [ ] Customer reviews & ratings
- [ ] Inventory management
- [ ] Automated app build pipeline

### Phase 3: Scale & Automation
- [ ] Multi-outlet support per tenant
- [ ] Franchise management
- [ ] One-click tenant deployment
- [ ] API for third-party integrations
- [ ] Tenant marketplace (plugins/addons)
- [ ] White-label mobile app generator

---

**Document End**

*This context document serves as the single source of truth for the Coffee Shop & Resto Digital Ecosystem project. All development decisions should align with the principles and specifications outlined here.*
