# TableNet

A real-time restaurant ordering system with 3 apps: **Customer** (QR scan → order), **Waiter** (table management), and **Kitchen** (ticket board + admin).

Built with React + Vite + Supabase. Monorepo using npm workspaces.

---

## Full Setup Guide (Fresh Start)

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a **new project**
2. Wait for it to finish provisioning (~2 minutes)
3. Go to **Project Settings → API** and copy:
   - `Project URL` (e.g. `https://xxxxx.supabase.co`)
   - `anon public` key (the long JWT string)

### Step 2 — Run the Schema

1. Go to **SQL Editor** in the Supabase Dashboard
2. Paste the **entire** contents of [`/supabase/schema.sql`](supabase/schema.sql)
3. Click **Run**
4. This creates all tables, RLS policies, RPC functions, and seeds a demo restaurant with 15 tables

### Step 3 — Reload PostgREST Schema Cache

> **This is critical.** Without this, the API returns 406 errors because it doesn't know about the new tables.

Go to **Settings → API** → click the **"Reload"** button next to "Schema cache"

### Step 4 — Create Auth Users

Go to **Authentication → Users** → click **"Add user"** → **"Create new user"** and create these two accounts:

| Email | Password | Purpose |
|-------|----------|---------|
| `kitchen@tablenet.app` | (your choice) | Kitchen/Admin portal login |
| `waiter@tablenet.app` | (your choice) | Waiter portal login |

### Step 5 — Link Users to Restaurant

After creating the auth users, go back to **Authentication → Users** and copy each user's **UID** (the UUID in the first column).

Then go to **SQL Editor** and run:

```sql
-- Kitchen user
INSERT INTO public.user_roles (user_id, restaurant_id, role) VALUES
  ('<KITCHEN_USER_UID>', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'kitchen');

-- Waiter user
INSERT INTO public.user_roles (user_id, restaurant_id, role) VALUES
  ('<WAITER_USER_UID>', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'waiter');
```

Replace `<KITCHEN_USER_UID>` and `<WAITER_USER_UID>` with the actual UUIDs you copied.

The restaurant ID `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11` is the demo restaurant created by the schema seed data.

### Step 6 — Set Environment Variables

In **each** of the 3 app folders, update the `.env.local` file:

**`apps/customer/.env.local`**, **`apps/waiter/.env.local`**, **`apps/kitchen/.env.local`**:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 7 — Install & Run

```bash
npm install
npm run dev
```

This starts all 3 apps:
- **Customer** → `http://localhost:5173/t/tbl_abc001` (simulate scanning QR for Table 1)
- **Waiter** → `http://localhost:5174/login` (login with `waiter@tablenet.app`)
- **Kitchen** → `http://localhost:5175/login` (login with `kitchen@tablenet.app`)

Or run individually:
```bash
npm run dev -w apps/customer
npm run dev -w apps/waiter
npm run dev -w apps/kitchen
```

---

## Project Structure

```
tablenet/
├── apps/
│   ├── customer/      # Customer-facing menu & ordering (public, no auth)
│   ├── waiter/        # Waiter portal (auth required)
│   └── kitchen/       # Kitchen admin portal (auth required)
├── packages/
│   └── supabase/      # Shared Supabase client (@tablenet/supabase)
├── supabase/
│   └── schema.sql     # Complete database schema + seed data
└── package.json       # Monorepo root (npm workspaces)
```

---

## Netlify Deployment (Production)

Deploy as **3 separate Netlify sites** from the same GitHub repo.

Set these **environment variables** on all 3 sites:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

| App | Base directory | Build command | Publish directory |
|-----|---------------|---------------|-------------------|
| Customer | `apps/customer` | `npm run build` | `apps/customer/dist` |
| Waiter | `apps/waiter` | `npm run build` | `apps/waiter/dist` |
| Kitchen | `apps/kitchen` | `npm run build` | `apps/kitchen/dist` |

> After deploying, update the production customer URL in `apps/kitchen/src/components/TableManager.jsx` (search for `tablenet-customer.netlify.app` and replace with your actual Netlify domain).

Each app has a `public/_redirects` file for React Router SPA support.

---

## Key Emails Used in Code

| Email | Used in | Purpose |
|-------|---------|---------|
| `kitchen@tablenet.app` | Kitchen Login, Settings | Kitchen portal authentication |
| `waiter@tablenet.app` | Waiter Login, Settings | Waiter portal authentication |

These are hardcoded in the login validation. If you change them, update:
- `apps/kitchen/src/components/Login.jsx`
- `apps/waiter/src/components/Login.jsx`
- `apps/kitchen/src/components/SettingsManager.jsx`

---

## Database Migration (Between Supabase Instances)

See [`migration.MD`](migration.MD) for instructions on migrating data between Supabase projects using `pg_dump`.
