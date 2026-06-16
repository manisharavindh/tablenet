# TableNet Setup & Deployment Guide

This guide will walk you through initializing the database, running the three monorepo applications locally, and configuring them for production deployment.

## 1. Supabase Initialization (Database)

1. **Create a Supabase Project**: Head over to [supabase.com](https://supabase.com) and create a new project.
2. **Execute Schema & Seed Data**: 
   - Navigate to the **SQL Editor** in the Supabase Dashboard.
   - Copy the contents of `/supabase/schema.sql` from this repository.
   - Run the SQL script. This will create your `restaurants`, `tables`, `menu_items`, `orders`, and `user_roles` tables, along with the necessary RLS policies. It will also seed 15 static tables with `qr_token`s ranging from `tbl_abc001` to `tbl_abc015`.
3. **Get API Keys**: 
   - Go to **Project Settings -> API**.
   - Copy your `Project URL` and `anon public` key.

## 2. Running Locally

We utilize Vite and npm workspaces. To run the frontend locally:

1. **Set Environment Variables**:
   In each app folder (`/apps/customer`, `/apps/waiter`, `/apps/kitchen`), create a `.env.local` file with:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
2. **Install Dependencies**:
   From the root of the repository, run:
   ```bash
   npm install
   ```
3. **Start Development Servers**:
   You can run all three apps simultaneously using the root workspace command:
   ```bash
   npm run dev
   ```
   Or run them individually:
   - `npm run dev -w apps/customer` (Accessible via `http://localhost:5173/t/tbl_abc001`)
   - `npm run dev -w apps/waiter` (Accessible via `http://localhost:5174/login`)
   - `npm run dev -w apps/kitchen` (Accessible via `http://localhost:5175/login`)

## 3. Netlify Deployment (Production)

Because TableNet is a monorepo, we will deploy it as three completely separate Netlify sites linked to this single GitHub repository.

### For ALL Three Sites:
1. Go to Netlify and select **Add new site** -> **Import an existing project** from your GitHub repo.
2. **Environment Variables**: During setup, click "Add environment variables" and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Customer Portal Configuration:
- **Base directory**: `apps/customer`
- **Build command**: `npm run build`
- **Publish directory**: `apps/customer/dist`
*(A `_redirects` file is already included in `apps/customer/public` to map React Router paths correctly).*

### Waiter Portal Configuration:
- **Base directory**: `apps/waiter`
- **Build command**: `npm run build`
- **Publish directory**: `apps/waiter/dist`
*(You will need to create a similar `public/_redirects` file for this app if you want deep linking to work in production).*

### Kitchen Portal Configuration:
- **Base directory**: `apps/kitchen`
- **Build command**: `npm run build`
- **Publish directory**: `apps/kitchen/dist`
*(You will need to create a similar `public/_redirects` file for this app if you want deep linking to work in production).*
