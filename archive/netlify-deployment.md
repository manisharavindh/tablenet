# Netlify Deployment Guide for TableNet Monorepo

We will deploy the three Vite applications (`customer`, `waiter`, and `kitchen`) as three separate Netlify sites linked to the exact same GitHub repository. Netlify has first-class support for monorepos, allowing you to configure unique build contexts for each.

## Prerequisites
- Push this repository to GitHub.
- Link your Netlify account to your GitHub.

## Environment Variables (All Sites)
Ensure you set the following environment variables in the Netlify UI for **all three** sites:
- `VITE_SUPABASE_URL`: Your Supabase API URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.

---

## 1. Customer Site Setup
When creating a "New site from Git", select the TableNet repo and use the following settings:

- **Base directory**: `apps/customer`
- **Build command**: `npm run build`
- **Publish directory**: `apps/customer/dist`

*Note: The `_redirects` file is already located in `apps/customer/public/_redirects` to handle the React Router SPAs.*

---

## 2. Waiter Site Setup
Create a second "New site from Git", select the TableNet repo and use the following settings:

- **Base directory**: `apps/waiter`
- **Build command**: `npm run build`
- **Publish directory**: `apps/waiter/dist`

---

## 3. Kitchen Site Setup
Create a third "New site from Git", select the TableNet repo and use the following settings:

- **Base directory**: `apps/kitchen`
- **Build command**: `npm run build`
- **Publish directory**: `apps/kitchen/dist`

---

### Why this works:
Because NPM Workspaces are configured at the root, Netlify will automatically detect the `package.json` at the root, install all dependencies (including `@tablenet/supabase`), and then intelligently execute the build commands from within each specific Base Directory context.
