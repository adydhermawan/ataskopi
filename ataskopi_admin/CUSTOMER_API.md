# Customer API Documentation (Mobile Backend)

This document provides the API specifications for the Customer Mobile App (Flutter). All endpoints are built with **Next.js 14 App Router** and powered by **Prisma 6** and **Supabase (PostgreSQL)**.

---

## 🔐 Base Configuration

### Base URL
`https://{tenant-slug}.ataskopi.com/api`

### Tenant Isolation
The API uses a white-label architecture. Tenant isolation is enforced via:
1. **Subdomain**: The system automatically extracts the tenant slug from the subdomain (e.g., `demo.ataskopi.com`).
2. **Development/Manual**: For development, you can pass the `x-tenant-id` header with the tenant slug.

### Authentication
Most endpoints require a JWT token in the `Authorization` header.
- **Header**: `Authorization: Bearer <token>`
- **Endpoints marked with 🔒** require authentication.
- **Endpoints marked with 🌐** are public.

---

## 🏷️ Product Catalog

### 1. List Categories 🌐
`GET /api/categories`
- Fetches all active product categories for the current tenant.
- **Response**: List of categories with product counts.

### 2. List Products 🌐
`GET /api/products`
- **Query Params**:
  - `category`: string (slug) - Filter by category.
  - `search`: string - Search product name.
  - `recommended`: boolean - Show only recommended items.
  - `available`: boolean (default: true) - Show only available items.
- **Response**: List of products including base price, options (size, sugar, etc.), and modifiers (extra shot, topping).

### 3. GET Product Detail 🌐
`GET /api/products/[id]`
- **Response**: Detailed product info including all selection possibilities.

---

## 🛒 Order Management

### 1. Create Order 🔒
`POST /api/orders`
- **Request Body**:
  ```json
  {
    "outletId": "uuid",
    "orderType": "dine_in | pickup | delivery",
    "items": [
      {
        "productId": "uuid",
        "quantity": 2,
        "selectedOptions": [{ "optionId": "uuid", "valueId": "uuid" }],
        "selectedModifiers": [{ "modifierId": "uuid", "quantity": 1 }],
        "notes": "Less ice"
      }
    ],
    "paymentMethod": "qris | cash",
    "tableId": "uuid (required for dine_in)",
    "scheduledTime": "ISO DateTime (required for pickup)",
    "deliveryAddress": { "latitude": 0, "longitude": 0, "address": "...", "notes": "..." },
    "voucherCode": "string (optional)",
    "pointsToRedeem": 100 (optional)
  }
  ```
- **Response**: 201 Created with order number and pricing breakdown.

### 2. Order History 🔒
`GET /api/orders`
- **Query Params**:
  - `status`: "active" | "completed"
  - `limit`: number
  - `offset`: number
- **Response**: Paginated list of user orders.

### 3. Order Detail 🔒
`GET /api/orders/[id]`
- **Response**: Complete details including item list, pricing breakdown, and current status history.

---

## 🏆 Loyalty & Rewards

### 1. Get Loyalty Info 🔒
`GET /api/me/loyalty`
- **Response**:
  - `loyaltyPoints`: Current balance.
  - `totalSpent`: Lifetime spend for tiering.
  - `currentTier`: Details with progress to next tier.
  - `recentTransactions`: Points earning/redemption history.

### 2. Available Vouchers 🔒
`GET /api/me/vouchers`
- **Query Params**:
  - `filter`: "available" | "all"
- **Response**: List of vouchers user can use based on their current loyalty tier.

---

## 👤 Account Management

### 1. Get Profile 🔒
`GET /api/me/profile`
- **Response**: User name, email, phone, points, and current tier.

### 2. Update Profile 🔒
`PATCH /api/me/profile`
- **Request Body**: `{ "name": "New Name", "email": "new@email.com" }`
- **Validation**: Email must be unique within the tenant.

### 3. List Outlets 🌐
`GET /api/outlets`
- **Query Params**:
  - `latitude`: float
  - `longitude`: float
- **Response**: List of outlets, sorted by distance if coordinates are provided.

---

## ⚠️ Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | Bad Request | Validation failed or business logic violation. |
| 401 | Unauthorized | Missing or invalid auth token. |
| 403 | Forbidden | User doesn't belong to tenant or lack of permissions. |
| 404 | Not Found | Resource or Tenant not found. |
| 422 | Unprocessable | Zod validation failed (includes field details). |
| 500 | Server Error | Internal server error. |

---

## 🧪 Testing
You can run the automated test suite to verify business logic and validation:
`npm test`
