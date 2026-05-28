# Mobilize Platform Launch Checklist

A guide for deploying, configuring, and verifying the Mobilize platform in a production environment.

## Phase 1: Database & Supabase Infrastructure
- [ ] **PostGIS Extension**: Ensure PostGIS extension is enabled in the database (`CREATE EXTENSION IF NOT EXISTS postgis;`).
- [ ] **Database Schema**: Apply all migrations / `schema.sql` definitions.
- [ ] **Row Level Security (RLS)**:
  - [ ] Verify that all tables have RLS enabled.
  - [ ] Ensure campaigner policies protect campaigner data.
  - [ ] Ensure participant profiles are discoverable only when `is_discoverable = true` and `is_online = true`.
- [ ] **Admin Account Roles**: Ensure the first platform administrator has the role `admin` manually updated in the database (`UPDATE users SET role = 'admin' WHERE email = '...';`).

## Phase 2: Payment Integration (Razorpay)
- [ ] **API Keys**: Configure production Razorpay Key ID and Secret in API environment variables.
- [ ] **Webhook Settings**:
  - [ ] Register API webhook URL in Razorpay Dashboard: `https://api.mobilize.com/api/wallet/webhook`
  - [ ] Select events: `order.paid`, `payout.processed`, `payout.failed`, `payout.reversed`.
  - [ ] Set and copy `RAZORPAY_WEBHOOK_SECRET` to production env.
- [ ] **Payouts Account**: Verify that the Razorpay Payouts account has sufficient funding balance and standard UPI/Bank account payouts are enabled.

## Phase 3: Deployment Prep & Security Configuration
- [ ] **CORS Settings**: Set `CORS_ORIGIN` in API to only allow official campaigner and admin web domains.
- [ ] **Rate Limiting**: Verify rate limiting thresholds are active and not blocking legitimate web clients (default: 100 req/min for API, 10 req/min for auth).
- [ ] **SSL Certificates**: Ensure all endpoints (`api.mobilize.com`, `dashboard.mobilize.com`, `admin.mobilize.com`) have valid SSL certificates (e.g. Let's Encrypt).
- [ ] **Admin IP Whitelist / VPN**: Restrict access to `admin.mobilize.com` (using Supabase Service Key direct connection) to internal VPN / IP whitelists.

## Phase 4: Verification Checklist (Post-Deployment)
- [ ] **Health Endpoint Check**: Fetch `https://api.mobilize.com/api/health` and verify `db` connection state returns `"connected"`.
- [ ] **Campaigner Flow**:
  - [ ] Create campaigner account, verify login.
  - [ ] Top up wallet with Razorpay test payment (verify redirect, success modal, wallet balance update).
  - [ ] Create a new campaign (verify it enters `pending_approval` status).
- [ ] **Admin Portal Flow**:
  - [ ] Log in to Admin panel.
  - [ ] Locate pending campaign in Queue, review and click **Approve** (verify campaign status becomes `active`).
- [ ] **Participant Flow**:
  - [ ] Open Participant App (mobile).
  - [ ] View available campaigns on the Feed.
  - [ ] Click **Apply** (verify application state changes to `pending` or `confirmed`).
  - [ ] Simulate event completion, campaigner marks participant check-out, and verification verifies GPS/payout status.
