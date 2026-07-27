# Ashapura Quotation Management

DPD & Non-DPD quotation management for Ashapura Impex: dynamic rate-component
builder, customizable container sizes, role-based approval workflow (Draft →
Pending → Approved → Sent), PDF generation & email, dashboard analytics, and
quotation-to-invoice conversion.

## Stack

- **Client:** React 19 + Vite + Mantine + TanStack Query + React Router
- **Server:** Node.js + Express + Prisma (MySQL)
- **Shared:** `packages/calc-engine` — the rate calculation logic, used identically
  by the client (live preview) and server (authoritative recompute)

## Prerequisites

- Node.js 20+
- MySQL 8.0 (a database named `ashapura_quotation`; the app creates it on first migrate)

## First-time setup

```bash
npm install

# Copy the example env file into server/.env and fill in your DB credentials
cp .env.example server/.env

npm run prisma:migrate     # creates tables and runs prisma/seed.ts
```

The seed script creates a starter Admin user, two container sizes (20ft/40ft), a
"DPD Standard" rate template, and a default PDF template. It prints the seeded
Admin's email/password to the console — **change that password after first login**.

Optional seed overrides (set before running `prisma:migrate` or `prisma:seed`):

```bash
SEED_ADMIN_EMAIL=you@company.com SEED_ADMIN_PASSWORD='...' npm run prisma:seed
```

## Development

Run the API and the client dev server in two terminals:

```bash
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5174 (or next free port)
```

`client/.env` points the SPA at the API via `VITE_API_BASE_URL`.

## Production build & run

```bash
npm run build   # builds calc-engine, then client, then server
npm start       # runs server/dist/index.js with NODE_ENV=production
```

In production, Express serves the built client (`client/dist`) itself — one
process, one port (`PORT` in `server/.env`, default 4000). No separate web
server is needed.

### Running as a persistent Windows service

The repo includes `ecosystem.config.cjs` for [pm2](https://pm2.keymetrics.io/):

```bash
npm run build
npm install -g pm2 pm2-windows-startup
pm2 start ecosystem.config.cjs
pm2 save
pm2-startup install      # registers pm2 to launch on Windows boot
```

Use `pm2 logs ashapura-quotation`, `pm2 restart ashapura-quotation`, and
`pm2 stop ashapura-quotation` to manage it afterward.

## Environment variables (`server/.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection string. URL-encode special characters in the password (e.g. `@` → `%40`). |
| `JWT_SECRET` | Signs auth cookies. Also used to derive the key that encrypts the SMTP password at rest — changing it invalidates stored SMTP credentials. |
| `PORT` | API port (default 4000). |
| `NODE_ENV` | `development` (default) or `production` — controls whether Express serves the built SPA. |

SMTP (for emailing quotation/invoice PDFs) is configured in-app under **Admin
Settings**, not via environment variables — it's stored in the database
(password encrypted at rest) so it can be changed without a redeploy.

## Testing

```bash
npm run test:calc-engine   # unit tests for the shared rate-calculation engine
```

## Project structure

```
packages/calc-engine/   shared rate calculation logic (fixed / percentage / per-container, tax handling)
server/                 Express API, Prisma schema & migrations, PDF templates
client/                 React SPA
```

Each backend feature area lives under `server/src/modules/<name>/` (service +
routes). PDF templates (Handlebars) are in `server/src/lib/pdf/templates/`.
