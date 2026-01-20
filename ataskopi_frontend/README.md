# ☕ AtasKopi - Customer Mobile App

[![Flutter](https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white)](https://flutter.dev)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Riverpod](https://img.shields.io/badge/Riverpod-02569B?style=for-the-badge&logo=flutter&logoColor=white)](https://riverpod.dev)

Digital ecosystem and end-to-end applications designed to transform traditional F&B operations into modern, efficient, and customer-oriented systems. This repository contains the **Customer Mobile App** built with Flutter.

---

## 🎯 Project Overview: "The 3-Click Experience"

AtasKopi focuses on minimizing friction between customer cravings and order fulfillment. Customers can complete an order in just **three main steps**:

1.  **Select Method** (Dine-in, Pickup, or Delivery)
2.  **Customize Menu** (Variants, Toppings, Notes)
3.  **Digital Payment** (Static QRIS or Cash for Dine-in)

---

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Flutter (Android, iOS, Mobile Web) |
| **State Management** | Riverpod |
| **Backend** | Supabase (Auth, DB, Real-time, Storage) |
| **Maps** | OpenStreetMap via `flutter_map` (No Google Maps API) |
| **Design System** | Custom UI (Primary Blue: `#124fa5`, Accent Gold: `#ffb400`), Inter/Poppins Font, 16px Border Radius |

---

## ✨ Key Features

### 1. Onboarding & Authentication
| Screen | Status | Key Components |
|---|---|---|
| Onboarding Slides | `[ ]` | 3 Illustration slides, Pagination dots, "Skip" & "Mulai" buttons |
| Auth Entry (Phone Input) | `[x]` | Logo, Incentive badge, Phone (+62) input, Google Auth button |
| New User Registration | `[x]` | Read-only phone, Full name input, Email input |
| PIN Security | `[x]` | Dynamic greeting, Avatar, 6-dot PIN, Custom keypad, "Lupa PIN?" link |

### 2. Home Dashboard
| Screen | Status | Key Components |
|---|---|---|
| Home Main Screen | `[x]` | User greeting, Loyalty card (Tier, Points, Progress bar), Order mode selection (Dine-in, Pickup, Delivery), Promo carousel, Product recommendations |

### 3. Ordering Flow
| Screen | Status | Key Components |
|---|---|---|
| Order Mode Modals | `[x]` | Dine-in: QR Scanner. Pickup: Date/Time Picker. Delivery: OSM Map Pin Drop. |
| Menu Catalog | `[x]` | Search bar, Category tabs, Product list with "Add" button, Floating cart bar |
| Product Customizer | `[x]` | Product image, Variant selection (Hot/Ice), Toppings (Checkboxes), Notes, Quantity stepper |

### 4. Checkout & Payment
| Screen | Status | Key Components |
|---|---|---|
| Checkout Summary | `[x]` | Item list, Voucher input, Points redemption toggle, Subtotal, Tax (PPN 11%), Total |
| Payment Method Selection | `[x]` | QRIS (All modes), Cash (Dine-in only) |
| QRIS Payment Display | `[x]` | Total amount, Static QRIS code, Countdown timer, "Saya Sudah Bayar" button |
| Post-Payment Flow | `[ ]` | Redirect to Activity (Aktif) tab with "Menunggu Verifikasi" status |

### 5. Activity & Profile
| Screen | Status | Key Components |
|---|---|---|
| Activity/Tracking | `[x]` | "Aktif" (Active) & "Riwayat" (History) tabs, Status stepper (Unpaid → Paid → Prep → Ready → Done) |
| Notifications Center | `[x]` | Filter chips (Transaksi, Promo, Loyalty), Unread badge, Card list |
| User Profile (Edit) | `[x]` | Avatar upload, Name/Email inputs, Phone (Locked), "Simpan Perubahan" button |

---

## 🪙 Loyalty & Leveling System (Simplified MVP)

| Feature | Description |
|---|---|
| **Point Earning** | 1 Item = 1 Point (admin configurable) |
| **Point Redemption** | 1 Point = Rp 1,000 (default, admin configurable). Min. 10 points to redeem. |
| **Membership Tiers** | Bronze (0-100 pts), Silver (100-500 pts), Gold (500+ pts). Tier-based voucher promos. |

---

## 💳 Payment Methods

| Method | Availability | Verification |
|---|---|---|
| **Static QRIS** | All order modes (Dine-in, Pickup, Delivery) | Manual check by Cashier via Web Dashboard |
| **Cash** | Dine-in only | Paid at cashier, status updated manually |

---

## 🎨 Design System

| Token | Value |
|---|---|
| Primary Color | `#124fa5` (Blue) |
| Accent Color | `#ffb400` (Gold) |
| Base Color | `#ffffff` (White) |
| Border Radius | `16px` |
| Heading Font | Poppins |
| Body Font | Inter |

---

## 📂 Project Structure

```text
lib/
├── config/              # Tenant & environment configuration
├── core/                # Theme, constants, and global configs
│   └── theme/           # AppColors, AppTheme
├── features/            # Feature-first architecture
│   ├── onboarding/      # Walkthrough slides (3 screens)
│   ├── auth/            # Phone Entry, Registration, PIN Security
│   ├── home/            # Dashboard, Order Mode Selection
│   ├── menu/            # Menu Catalog, Product Customizer
│   ├── checkout/        # Cart, Checkout Summary, Payment (QRIS/Cash)
│   ├── activity/        # Order Tracking (Aktif), Order History (Riwayat)
│   ├── notifications/   # Notifications Center
│   └── profile/         # User Profile, Settings, Addresses
├── shared/              # Reusable widgets and utilities
└── main.dart            # Entry point
```

---

## 🚀 Getting Started

### Prerequisites
-   Flutter SDK (>=3.0.0)
-   Supabase Account or Local Docker Container

### Environment Setup
Create a `.env` file or use `--dart-define` for build configurations.

### Running the App
For development with a specific tenant:
```bash
flutter run --dart-define=TENANT_ID=demo
```

For production build:
```bash
flutter build apk --dart-define=TENANT_ID=ataskopi-demo
```

---

## 👨‍💻 Developer

**Ady Putra Dhermawan**
*Last Updated: 2026-01-18*
