# NiceAttend — Nice School System

QR-code attendance management system designed for **Nice School System** (~500 students, single campus), optimized for mobile use by the **Principal** and **Vice Principal** connected to a central **Neon Serverless PostgreSQL** database.

---

## Technology Stack (Phase 3 Initialized)

- **Framework:** Next.js (v14+ App Router, TypeScript)
- **Styling:** Tailwind CSS (Mobile-first, `@media print` support)
- **Database:** Neon Serverless PostgreSQL 16
- **ORM:** Prisma ORM (v5+)
- **Testing:** Vitest + Playwright

---

## Getting Started

### 1. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update `.env` with your actual Neon PostgreSQL connection credentials:

- `DATABASE_URL`: Pooled connection string (`?sslmode=require&pgbouncer=true`)
- `DIRECT_URL`: Direct unpooled connection string (required for migrations)
- `SESSION_SECRET`: 32+ character random string

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Schema & Migration

Generate the Prisma client:

```bash
npm run prisma:generate
```

Deploy migrations to your Neon database:

```bash
npm run db:migrate
```

### 4. Seed 500 Synthetic Students

Run the synthetic demo seed script:

```bash
npm run db:seed
```

This seeds:
- 2 Administrative Accounts (Principal & Vice Principal)
- 10 Classes (Grade 1 through Grade 10)
- 20 Sections (Section A and Section B per grade)
- Exactly 500 synthetic students (25 per section) with unique sequential codes (`STD-2026-0001` to `STD-2026-0500`) and opaque UUIDv4 QR tokens.

---

## Implemented Capabilities & Development Roadmap

| Phase | Milestone | Status | Key Features |
| :--- | :--- | :---: | :--- |
| **Phase 1** | Requirements Baseline | Completed | Scope definition, PRD v1.4.0 approval |
| **Phase 2** | Tech Stack & Architecture | Completed | Zero-budget baseline, Neon PostgreSQL, Next.js App Router |
| **Phase 3** | Project Setup & Seed | Completed | Prisma schema, 500 synthetic students, Grade 1–10 sections |
| **Phase 4** | Authentication & RBAC | Completed | Argon2id/Bcrypt hashing, secure HTTP-only cookie sessions |
| **Phase 5** | Student Management | Completed | Add, edit, view, soft-deactivate safeguards |
| **Phase 6** | QR Generation & ID Cards | Completed | Zero-PII UUIDv4 tokens, A4 8-card printable sheet with "Nice School System" header |
| **Phase 7** | Camera Scanner & Live Engine | Completed | In-browser WebRTC camera, instant audio/haptic feedback, 08:00 cutoff logic |
| **Phase 8** | Manual Fallback & Audit Trail | Completed | Manual marking, bulk confirm absences, immutable forensic audit trail |
| **Phase 9** | Dashboard, Reports & CSV | Completed | Real-time KPI counters, class summaries, RFC 4180 CSV export, print stylesheet |
| **Phase 10**| Acceptance & Integrity Matrix | Completed | 50 automated tests verifying TC-MOB to TC-EXP acceptance criteria |

---

## Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start local Next.js development server at `http://localhost:3000` |
| `npm run build` | Compile optimized production build |
| `npm run start` | Start production server |
| `npm run lint` | Run Next.js ESLint verification |
| `npm run typecheck` | Run TypeScript compiler typecheck (`tsc --noEmit`) |
| `npm test` | Run Vitest test suite |
| `npm run prisma:validate` | Validate Prisma schema against specifications |
| `npm run prisma:generate` | Generate Prisma Client types |
| `npm run db:migrate` | Deploy migrations to database |
| `npm run db:seed` | Run synthetic 500-student demo seed |
