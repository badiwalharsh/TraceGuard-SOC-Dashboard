# Project Case Study: TraceGuard SOC Platform

## Executive Summary
**TraceGuard SOC** is a full-stack, enterprise-grade Security Operations Center (SOC) incident response and threat intelligence platform. Built with **Next.js 16 (App Router)**, **TypeScript**, **PostgreSQL**, and **Prisma**, it provides SOC teams with real-time threat telemetry, detection rule enforcement, structured incident triage, multi-source alert ingestion, anti-XSS forensic note threads, and automated report generation.

---

## 🎯 The Problem
Modern Security Operations Centers face significant friction:
1. **Alert Fatigue & Disjointed Ingestion**: Telemetry arrives from disparate IDS/SIEM sources in irregular JSON and CSV formats without automatic correlation.
2. **Access Control & IDOR Vulnerabilities**: Poor role separation often allows analysts to accidentally tamper with detection rules, register unauthorized endpoints, or view incidents outside their operational scope.
3. **Data Poisoning & Injection Risks**: Ingesting unvetted log dumps risks XSS in analyst notes and formula injection (CSV/DDE) in spreadsheet exports.
4. **Compliance Gaps**: Lack of immutable, structured audit trails makes post-incident compliance reviews difficult.

---

## 💡 Engineering Solutions & Design Choices

### 1. Robust Role-Based Access Control (RBAC) & IDOR Defense
- Implemented server-side authorization boundaries enforced directly in Next.js Route Handlers.
- **Admin Role**: Full authority to create detection rules, manage the corporate asset inventory, view complete audit trails, and delete records.
- **Analyst Role**: Dedicated triage capabilities—updating incident status, documenting investigations, claiming incidents, and generating reports—while being strictly prevented from unauthorized privilege escalation or accessing unassigned incidents.

### 2. Multi-Format Ingestion with Formula & Script Injection Immunity
- Engineered a streaming validation engine supporting both batch JSON and CSV alert records.
- Enforced strict 5MB payload limits, 100-row batch ceilings, and data-only parsing (zero code execution).
- Implemented automated formula sanitization (`=`, `+`, `-`, `@` character escaping) to safeguard against Excel DDE/formula injection vulnerabilities.
- Integrated automated incident correlation logic that correlates incoming alerts with open incidents by category and IP addresses, escalating incident severity dynamically.

### 3. Forensic Collaboration with Zero-Trust Anti-XSS Sanitization
- Developed an interactive incident investigation workspace with interactive timelines and analyst notes.
- Embedded server-side HTML entity sanitization on all analyst inputs, completely neutralizing stored and reflected XSS attempts.

### 4. Automated Post-Mortem Report Generation
- Built an on-demand report generation engine delivering structured JSON telemetry and clean, printable HTML summaries with findings, affected assets, timelines, and remediation playbooks.

### 5. Production Security Hardening
- Deployed strict HTTP headers: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (HSTS), and `Permissions-Policy`.
- Engineered AES-256-GCM encrypted session management with `HttpOnly`, `SameSite=Strict`, and automatic 2-hour rotation.

---

## 📊 Technical Highlights & Skills Demonstrated

| Competency | Demonstrated In Project |
| :--- | :--- |
| **Full-Stack Architecture** | Next.js 16 App Router, TypeScript, Server Components, Route Handlers |
| **Database & ORM** | PostgreSQL relational schema design, Prisma ORM, foreign key cascading, transactions |
| **Defensive Security** | IDOR mitigation, Anti-XSS, CSV/Formula injection defense, CSP, AES-256-GCM cryptography |
| **Quality & Testing** | 14 automated unit test suites (Node.js test runner) + Playwright end-to-end integration tests |
| **UI/UX Excellence** | Tailored cyberpunk dark mode, accessible components, rich loading/empty/error states |

---

## 📸 Recommended Screenshots for Portfolio / LinkedIn Posts

1. **SOC Command Center**: Highlighting live threat metrics, severity distribution, and active threat environment.
2. **Interactive Incident Triage**: Showing the filtered incident queue with status badges and quick triage controls.
3. **Forensic Detail & Timeline**: Demonstrating the incident investigation view, event sequence, and analyst notes.
4. **Alert Ingestion Preview**: Showcasing the pre-commit alert parser, validation errors, and correlation summary.
5. **Printable Executive Report**: Displaying the generated incident post-mortem report.
