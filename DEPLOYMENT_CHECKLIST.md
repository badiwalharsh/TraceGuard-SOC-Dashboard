# TraceGuard SOC Platform - Production Deployment Checklist

This document provides a comprehensive, step-by-step checklist for deploying **TraceGuard SOC Dashboard** to **Vercel** paired with a managed **PostgreSQL** database (e.g., Neon, Supabase, AWS RDS, or Aiven).

---

## 🗄️ Phase 1: Managed PostgreSQL Provisioning

1. **Select a Managed PostgreSQL Provider**:
   - **Recommended Providers**: [Neon](https://neon.tech), [Supabase](https://supabase.com), [AWS RDS](https://aws.amazon.com/rds/postgresql/), or [Render Postgres](https://render.com).
2. **Create Database Instance**:
   - Database Name: `traceguard_prod`
   - SSL Mode: Required (`sslmode=require`)
   - Connection Pooling: Enable PgBouncer or Neon pooled connection if deploying serverless.
3. **Run Migrations on Production Database**:
   ```bash
   # Point DATABASE_URL to your managed production database string
   export DATABASE_URL="postgresql://user:password@ep-host.region.neon.tech/traceguard_prod?sslmode=require"
   
   # Deploy migrations
   npx prisma db push
   
   # (Optional) Seed initial production administrative user
   npx tsx prisma/seed.ts
   ```

---

## 🌐 Phase 2: Vercel Project Setup & Configuration

1. **Import Git Repository**:
   - Link your GitHub / GitLab repository in the Vercel Dashboard.
   - Framework Preset: **Next.js**
   - Root Directory: `./`
2. **Configure Environment Variables in Vercel Project Settings**:
   | Variable | Description | Example / Recommendations |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | Production PostgreSQL connection string | `postgresql://db_user:secret@db.neon.tech/traceguard?sslmode=require` |
   | `SESSION_SECRET` | 64-character high-entropy secret key | Generated via `openssl rand -hex 32` |
   | `NODE_ENV` | Environment identifier | `production` |
   | `NEXT_PUBLIC_APP_URL` | Canonical production domain | `https://traceguard-soc.vercel.app` |

---

## 🛡️ Phase 3: Pre-Deployment Security Audit

- [x] **No Secrets Committed**: Verified `.env`, `.env.local`, and test keys are in `.gitignore`.
- [x] **Security Headers & CSP**: Verified `next.config.ts` includes strict `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and HSTS.
- [x] **Session Cryptography**: Verified `SESSION_SECRET` is set to a unique 256-bit key in production.
- [x] **Cookie Security**: In production, `secure: true`, `httpOnly: true`, and `sameSite: 'strict'` are active.
- [x] **Input Validation**: All API routes validate request bodies with Zod.
- [x] **Anti-XSS & Anti-Formula Injection**: Sanitizers active on notes and file imports.
- [x] **Audit Trail Verification**: Audit logging records all admin and analyst mutations.

---

## 🚀 Phase 4: Production Build Verification

Run the verification suite locally prior to merging:
```bash
# 1. Type Check
npx tsc --noEmit

# 2. ESLint
npm run lint

# 3. Unit Tests
npx tsx --test tests/unit/backend.test.ts tests/unit/parser.test.ts

# 4. Production Build Test
npm run build
```

---

## 🔄 Phase 5: Post-Deployment Smoke Test

1. Visit production URL (`https://your-domain.vercel.app/login`).
2. Log in with production admin credentials.
3. Verify overview metrics load from production database.
4. Test creating a detection rule and registering an asset.
5. Log in with analyst credentials and verify that admin buttons are hidden (RBAC enforcement).
6. Triage an incident, add an analyst note, and generate an investigation report.
7. Check that audit logs record all executed actions.
