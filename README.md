# TraceGuard SOC — Next-Gen Security Operations Center & Incident Triage Platform

![TraceGuard SOC Platform](https://img.shields.io/badge/Security-SOC%20Platform-06b6d4?style=for-the-badge)
![Next.js 16](https://img.shields.io/badge/Next.js-16.3.3-000000?style=for-the-badge&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Embedded%20%26%20Cloud-336791?style=for-the-badge&logo=postgresql)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Cyberpunk%20Theme-38bdf8?style=for-the-badge&logo=tailwindcss)

**TraceGuard SOC** is an enterprise-grade Security Operations Center (SOC) incident response and threat intelligence management platform. Built with Next.js (App Router), TypeScript, and Prisma ORM, it delivers end-to-end telemetry ingestion, MITRE ATT&CK detection rule enforcement, real-time threat triage, analyst collaboration, automated report generation, and immutable compliance audit trails.

---

## 📸 Screenshots & Visual Overview

| SOC Command Center | Threat Investigation & Timelines |
| :---: | :---: |
| *SOC Overview Dashboard with Threat Gauge, Severity Distribution, Active Metrics* | *Deep Incident Triage, Forensic Timelines, and Live Analyst Notes* |

| Detection Rules & MITRE ATT&CK | Alert Ingestion Engine (JSON/CSV) |
| :---: | :---: |
| *Rule Management Library with ATT&CK Mapping & Logic Engine* | *Data-Only Alert Parser with Formula Injection Defense & Auto-Correlation* |

---

## ⚡ Key Capabilities & Feature Set

- **Command Center Telemetry**: Real-time threat posture scoring, active incident breakdown, severity heatmaps, and MITRE ATT&CK technique radar.
- **Incident Queue & Interactive Triage**: Dynamic multi-criteria filtering by Severity, Assignee, Status, and Date Range with quick triage actions.
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Complete system control, detection rule authoring, asset inventory management, incident deletion, and compliance audits.
  - **Analyst**: Incident investigation, triage status transitions (`NEW` ➔ `INVESTIGATING` ➔ `CONTAINED` ➔ `RESOLVED`), self-assignment, and forensic note logging.
- **Insecure Direct Object Reference (IDOR) Defense**: Server-side access control boundaries preventing analysts from viewing or modifying unassigned unauthorized incidents.
- **Secure Alert Ingestion Pipeline**:
  - Validates batch alert records (JSON & CSV) with strict size (5MB) and row limits (100 rows).
  - Data-only parsing (no execution of untrusted input).
  - **CSV / Formula Injection Sanitization**: Strips dangerous spreadsheet execution triggers (`=`, `+`, `-`, `@`).
  - **Automated Incident Correlation**: Matches alerts to existing open incidents by IP and category, or auto-spawns escalated incidents.
- **Forensic Investigation & Anti-XSS Notes**:
  - Rich analyst note thread with HTML sanitization preventing stored and reflected XSS.
  - Event timeline tracking forensic milestones.
- **Incident Report Generator**: Generates comprehensive printable and exportable incident post-mortem reports with findings, affected assets, timelines, and remediation recommendations.
- **Immutable Compliance Audit Trail**: Structured event logging recording actor, role, target entity, timestamp, and safe metadata.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Client Browser (SOC Analyst / Admin)"]
        UI["Cyberpunk Dark Mode Dashboard"]
        State["Client-Side State & Optimistic UI"]
    end

    subgraph SecurityBoundary["Security & Middleware Boundary"]
        Proxy["Next.js Proxy / Middleware"]
        CSP["HTTP Security Headers & CSP"]
        AuthGuard["AES-256-GCM Session Decryptor & RBAC Guard"]
    end

    subgraph Server["Next.js Backend Engine (App Router)"]
        Zod["Zod Validation & Sanitization Layer"]
        API_Auth["/api/auth (Login / Logout / Me)"]
        API_Incidents["/api/incidents (CRUD & IDOR Guards)"]
        API_Notes["/api/incidents/[id]/notes (Anti-XSS)"]
        API_Import["/api/import (Parser & Correlation Engine)"]
        API_Reports["/api/reports/generate (HTML / JSON Engine)"]
        API_Rules["/api/rules (Admin Detection Rule Engine)"]
        API_Assets["/api/assets (Admin Asset Manager)"]
    end

    subgraph Database["Database Persistence Layer"]
        PrismaClient["Prisma ORM Database Client"]
        AuditLogTable[("AuditLog (Immutable Trail)")]
        IncidentTable[("Incident & Timeline Tables")]
        AssetTable[("Asset & DetectionRule Tables")]
        UserTable[("User & Session Tables")]
    end

    Client -->|HTTPS + Encrypted Cookie| Proxy
    Proxy --> CSP
    CSP --> AuthGuard
    AuthGuard --> Zod
    Zod --> Server
    Server --> PrismaClient
    PrismaClient --> Database
```

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router + Turbopack) |
| **Language** | TypeScript 5 (Strict Mode) |
| **Database & ORM** | PostgreSQL / `@electric-sql/pglite` + Prisma ORM Next |
| **Styling** | Vanilla CSS + Tailwind CSS (Custom Dark Cyber-Palette) |
| **Validation** | Zod Schema Validation |
| **Authentication** | AES-256-GCM Encrypted Session Cookies (`HttpOnly`, `SameSite=Strict`) |
| **Testing** | Node.js Test Runner (Unit Tests) + Playwright (E2E Integration) |
| **Icons** | Lucide React |

---

## 🗄️ Database Schema Breakdown

```prisma
model User {
  id        String     @id @default(uuid())
  username  String     @unique
  name      String
  role      String     // "ADMIN" | "ANALYST"
  incidents Incident[]
  notes     Note[]
  auditLogs AuditLog[]
}

model Incident {
  id          String         @id @default(uuid())
  title       String
  description String
  status      String         // NEW, INVESTIGATING, CONTAINED, RESOLVED, CLOSED
  severity    String         // LOW, MEDIUM, HIGH, CRITICAL
  category    String
  sourceIp    String?
  destIp      String?
  assignedTo  User?          @relation(fields: [assignedToId], references: [id])
  timeline    EventTimeline[]
  notes       Note[]
  assets      IncidentAsset[]
  events      SecurityEvent[]
}

model Asset {
  id          String          @id @default(uuid())
  hostname    String
  ipAddress   String          @unique
  assetType   String          // SERVER, WORKSTATION, DATABASE, etc.
  criticality String          // LOW, MEDIUM, HIGH, CRITICAL
  incidents   IncidentAsset[]
}

model DetectionRule {
  id          String   @id @default(uuid())
  name        String
  mitreAttack String
  severity    String
  category    String
  query       String
  enabled     Boolean  @default(true)
}

model AuditLog {
  id        String   @id @default(uuid())
  actorId   String
  actorName String
  action    String
  entity    String
  entityId  String
  metadata  Json?
  timestamp DateTime @default(now())
}
```

---

## 🚀 Local Setup & Quickstart

### Prerequisites
- Node.js `20.x` or higher
- npm or yarn

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/traceguard-soc-dashboard.git
cd traceguard-soc-dashboard
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
PORT=3000
DATABASE_URL="postgresql://traceguard_admin:traceguard_secure_pass_2026@localhost:5432/traceguard_db?schema=public"
SESSION_SECRET="traceguard_soc_ultra_secure_session_encryption_key_2026_x89"
NODE_ENV="development"
```

### 3. Initialize & Seed Database
```bash
# Initialize database daemon (PGlite embedded TCP server)
node scripts/run-pglite.mjs

# In a separate terminal, seed fictional SOC data
npx tsx prisma/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🔑 Demo Credentials (Local Development)

| Role | Username | Password | Privileges |
| :--- | :--- | :--- | :--- |
| **SOC Administrator** | `admin` | `AdminPassword2026!` | Full Admin CRUD, Detection Rules, Assets, Deletion, Audit Logs |
| **SOC Analyst** | `analyst` | `AnalystPassword2026!` | Incident Triage, Investigation Notes, Status Updates, Reports |

---

## 🧪 Testing Suite

### Run Unit Tests (14 test suites covering schemas, RBAC, Anti-XSS, CSV injection):
```bash
npx tsx --test tests/unit/backend.test.ts tests/unit/parser.test.ts
```

### Run Playwright E2E Tests:
```bash
npx playwright test
```

### Type Checking & Linting:
```bash
npx tsc --noEmit
npm run lint
```

### Production Build:
```bash
npm run build
```

---

## 🔒 Security Decisions & Controls

1. **Zero Client Trust**: All mutations validate permissions server-side against the decrypted session token.
2. **Anti-XSS Sanitization**: Analyst notes are strictly encoded to prevent stored script injection attacks.
3. **Spreadsheet Formula Injection Defense**: Ingested and exported CSV fields starting with dangerous formula tokens (`=`, `+`, `-`, `@`) are prepended with single quotes (`'`).
4. **Strict HTTP Security Headers**: HSTS, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), strict Referrer Policy, and strict CSP disallowing untrusted execution.
5. **IDOR Mitigation**: Row-level ownership validation on all incident mutation and read operations.

---

## 🔮 Future Roadmap

- [ ] Webhook alerts integration (Slack / Microsoft Teams / PagerDuty).
- [ ] Automated Sigma rule translation engine.
- [ ] LLM-assisted forensic incident summarization and MITRE ATT&CK mapping.
- [ ] Multi-tenant organization isolation with dedicated workspace policies.
- [ ] STIX/TAXII threat feed ingestion automation.
