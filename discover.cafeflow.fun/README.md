# CafeFlow Discover (`discover.cafeflow.fun`)

Customer-facing marketplace for discovering artisan cafes, reserving dining tables with real-time seating availability validation, ordering takeaway or dine-in, and tracking preparation in real-time.

---

## 1. Architecture & Isolation Guarantee

`Discover/` is engineered as an **isolated customer marketplace web application**.

- **Zero Breaking Changes to Existing System:**
  - `app.cafeflow.fun` routes, dashboard, customer QR ordering, existing tables, payments, migrations, and backups are untouched and 100% operational.
  - Discover shares the authoritative Cloudflare D1 database (`cafeflow-db`) and Cloudflare R2 bucket (`cafeflow-assets`) safely without schema conflicts or duplicated data sources.
  - Server-verified reservations, order placement, and payments are strictly validated on the backend.

---

## 2. Directory Structure

```text
Discover/
├── app/
│   ├── api/
│   │   ├── cafes/              # Public cafe search & slug profile APIs
│   │   ├── reservations/       # Table reservation engine with availability checks
│   │   ├── orders/             # Order creation & live tracking APIs
│   │   ├── payments/verify/    # Razorpay cryptographic signature verification
│   │   ├── reviews/            # Verified customer ratings & reviews
│   │   └── user/profile/       # Customer profile & dietary preferences
│   ├── cafe/[slug]/            # Cafe dynamic showcase & table booking
│   ├── reservations/           # Global table reservation directory
│   ├── cart/                   # Cart, checkout, Razorpay, & counter payments
│   ├── orders/                 # My Orders & live order tracking timeline
│   ├── profile/                # Customer dietary preferences & contact info
│   ├── globals.css             # Tailwind design system with warm aesthetics
│   ├── layout.tsx              # Root responsive layout & PWA metadata
│   └── page.tsx                # Marketplace Discovery Home
├── components/
│   ├── navbar.tsx              # Desktop navigation bar with cart indicator
│   └── bottom-nav.tsx          # Mobile navigation bar (PWA mobile-first)
├── lib/
│   ├── db.ts                   # Authoritative D1 client (REST dev + Worker binding prod)
│   ├── auth.ts                 # Session and auth token verification
│   ├── cart-context.tsx        # Persistent client-side cart provider
│   └── razorpay.ts             # Razorpay client & signature verification
├── public/
│   └── manifest.json           # Installable PWA manifest
├── package.json                # Independent scripts and dependencies
├── tsconfig.json               # Independent TypeScript config
├── tailwind.config.ts          # Custom cafe theme & styling tokens
├── next.config.mjs             # Next.js configuration with PWA wrapper
├── wrangler.jsonc              # Cloudflare worker deployment configuration
└── README.md                   # This documentation
```

---

## 3. Local Development

### Prerequisites

Create `.env.local` inside `Discover/` (or inherit from parent root):

```env
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
D1_DATABASE_ID=your-d1-database-id
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token

NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_MAIN_APP_URL=https://app.cafeflow.fun
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxx
RAZORPAY_KEY_ID=rzp_test_xxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

### Running Locally

```bash
# Navigate to Discover directory
cd Discover

# Install dependencies (or run from root where dependencies are hoisted)
npm install

# Start development server on port 3001 (isolated from main app on 3000)
npm run dev
```

Visit: `http://localhost:3001`

---

## 4. Production Build & Deployment to `discover.cafeflow.fun`

### Build

```bash
cd Discover
npm run build:worker
```

### Deploy to Cloudflare Workers

```bash
cd Discover
npm run deploy:worker
```

Wrangler maps the worker directly to custom domain `discover.cafeflow.fun` with bindings to Cloudflare D1 (`cafeflow-db`) and Cloudflare R2 (`cafeflow-assets`).

---

## 5. Migration Phase Plan (Future Approval Required)

1. **Phase 1 (Completed):** Build & test Discover in isolated `Discover/` folder with independent dev/build workflow.
2. **Phase 2:** Staging review on `discover.cafeflow.fun` or preview worker URL.
3. **Phase 3:** DNS & Custom Domain routing verification.
4. **Phase 4:** Gradual traffic migration & customer URL mapping.
5. **Phase 5 (Explicit Approval Only):** Cleanup of deprecated customer routes inside `app/` without breaking any business dashboard flows.
