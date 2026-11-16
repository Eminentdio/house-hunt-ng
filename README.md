# HouseHunt NG

A production-quality, mobile-first rental marketplace for Nigeria that removes housing agents. The platform connects tenants directly with landlords.

## Design Principles

- **Mobile-first**: Many users are on phones with limited data
- **Energy orange accent** (`#EA580C`) with clean typography and rounded shapes
- **High contrast** for readability in various lighting conditions
- **Naira formatting**: `₦` with thousands separators (e.g., `₦900,000`)
- **Skeleton loaders** and lazy-loaded media for performance
- **Accessible** UI with clear error states

## Phase 1 Foundation

This phase sets up the project foundation including:

- Supabase schema with RLS policies
- Auth with username/password and role-based profiles
- Route guards for tenant/landlord/admin access
- Empty role dashboards
- Seed data
- Design system with energy orange theme

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project
- Paystack test account (for payment testing)

### 1. Environment Setup

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Schema

Run the schema SQL in your Supabase SQL Editor:

```bash
supabase db reset  # or run supabase/schema.sql manually
```

The schema file is at `supabase/schema.sql`.

### 4. Seed Data

Run the seed SQL to populate initial data:

```bash
supabase db execute < supabase/seed.sql
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## Phase 1 Features

### Auth System

- **Username login**: Case-insensitive username lookup via Supabase RPC
- **Signup**: Username, email, phone, full name, role selection
- **Roles**: `tenant`, `landlord`, `admin`
- **Profile management**: Each role has a `profiles` table record

### Role Guarded Routes

| Route | Access |
|-------|--------|
| `/` | Public (landing page) |
| `/login` | Public |
| `/signup` | Public |
| `/tenant` | Tenant + Admin |
| `/landlord` | Landlord + Admin |
| `/admin` | Admin only |

### Database Schema (Key Tables)

- **profiles**: User accounts with roles, username (case-insensitive unique)
- **landlord_profiles**: Landlord verification and bank details
- **categories**: House categories (self-contain, 1-bed, 2-bed, 3-bed, duplex, shop)
- **houses**: Property listings with approval status
- **house_media**: Photos and 360° tours per house
- **house_videos**: Up to 3 videos per house (enforced by DB trigger)
- **inspections**: Booking viewings
- **agreements**: Tenancy agreements
- **payments**: Escrow payments with fee calculation
- **renovation_updates**: Landlord progress updates
- **notifications_log**: Email notification audit trail
- **app_config**: Platform configuration (fee rate, limits)

### RLS Policies

- **Tenants**: See only their own agreements/payments/inspections
- **Landlords**: See only their own houses and related rows
- **Admins**: See everything
- **Public**: Only approved + available houses are visible

### Design System

- **Primary color**: Energy orange (`#EA580C`)
- **Rounded corners**: `0.75rem` radius throughout
- **Skeleton loaders**: On cards and image placeholders
- **Naira formatting**: Custom formatting component
- **Responsive**: Mobile-first breakpoints

## Phase Roadmap

| Phase | Focus |
|-------|-------|
| 1 | Foundation (complete) |
| 2 | Landlord listings, house CRUD, media upload, admin approval |
| 3 | Tenant experience: search, filters, house feature page |
| 4 | Agreement & payment: PDF, Paystack, escrow, receipts |
| 5 | Notifications: Resend emails, audit log, polish |
| 6 | Pilot readiness: test checklist, deployment notes |

## Known Limitations (Phase 1)

- No payment processing (Phase 4)
- No 360° tour rendering (Phase 3)
- No video player (Phase 3)
- No email notifications (Phase 5)
- No bank payouts via Paystack Transfer (Phase 4)

## Security Notes

- All secrets (Paystack, Resend) must be stored in Supabase secrets, never in client code
- RLS enforced on every table
- Username login resolves via secure RPC (no user enumeration in error messages)
- Rate limiting should be implemented on login and payment initialization
- NDPA 2023 compliance: collect minimal data, show privacy notice, get consent at signup