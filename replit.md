# PayDuka Workspace

## Overview

pnpm workspace monorepo using TypeScript. Full PayDuka crypto ecosystem: smart contracts deployed on Polygon Mainnet + a full PoS Terminal web app with AI agent.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite + TailwindCSS v4 + Radix UI + Recharts
- **Offline sync**: PowerSync + Supabase (credentials via env vars — graceful fallback when not set)
- **Card payments**: Currently recorded as a payment type in the DB. Stripe integration was not connected — to enable real card processing, either connect Stripe via the Integrations tab, or provide STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY as secrets for manual wiring.
- **AI**: OpenAI integration (gpt-4o) via Replit AI proxy — SSE streaming
- **Build**: esbuild (CJS bundle)

## Deployed Smart Contracts (Polygon Mainnet)

- **PDukaToken** (ERC-20, 21B supply): `0x5025053F6Dec8C8Cfa85AE24C0CB9e4935C98E54`
- **PDukaICO** (USDC/POL at $0.005/PDUKA, 1B seed round): `0xD8358ba36723b860FFC8E9830060a8Cf348B84d3`
- Both verified on Polygonscan
- Deployer wallet: `0x109BbEDA1a5DD8D7C82AB98E4Cffa1Cd5b29E1EA`
- Funds wallet: `0xDAe4743b26BfA6Cbe696E75B189b13A93bD36546`

## PayDuka PoS Terminal (`artifacts/pos-terminal`)

Full-featured merchant point-of-sale system at `/pos/`.

### Pages
- `/` — Checkout (primary): product grid, cart, Cash/USDC/POL/PDuka payments
- `/dashboard` — Sales analytics: today vs yesterday, monthly comparison, revenue trend chart, top products
- `/inventory` — Stock management: product CRUD, low-stock/out-of-stock alerts
- `/sales` — Transaction history with line-item detail
- `/ai` — PayDuka AI Agent: streaming chat for merchant insights (gpt-4o via SSE)

### Branding
- Dark navy `#0a1628`, neon green `#00FF88`, gold `#FFD700`
- PDuka token amounts always displayed in gold

## API Server (`artifacts/api-server`)

REST API at `/api/`. All routes in `artifacts/api-server/src/routes/`.

### Endpoints
- `GET/POST /api/products`, `GET/PATCH/DELETE /api/products/:id`
- `GET/POST /api/sales`, `GET /api/sales/:id`
- `GET /api/dashboard/summary` — today vs yesterday KPIs
- `GET /api/dashboard/daily-sales` — per-day revenue for current month
- `GET /api/dashboard/monthly-comparison` — current vs previous month
- `GET /api/dashboard/top-products` — top 10 by revenue this month
- `GET /api/dashboard/stock-alerts` — low/out-of-stock products
- `GET/POST /api/openai/conversations`, `GET/DELETE /api/openai/conversations/:id`
- `POST /api/openai/conversations/:id/messages` — SSE streaming AI chat

## Database Schema (`lib/db/src/schema/`)

- `products` — inventory catalog with price, stock, lowStockThreshold
- `sales` — transaction records with paymentMethod, pdukaEarned, txHash
- `sale_items` — line items per sale with quantity, unitPrice, subtotal
- `openai_conversations` — AI chat conversation threads
- `openai_messages` — individual messages with role (user/assistant)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — typecheck composite lib packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed database with 20 products and 37 sales
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Workspace Structure

```
artifacts/
  api-server/     — Express 5 REST API (port 8080, proxied at /api)
  pos-terminal/   — React + Vite PoS frontend (port 23386, proxied at /pos)
lib/
  api-spec/       — OpenAPI 3.1 spec (source of truth)
  api-zod/        — Generated Zod validation schemas
  api-client-react/ — Generated React Query hooks
  db/             — Drizzle ORM schema + client
  integrations-openai-ai-server/ — OpenAI server client
  integrations-openai-ai-react/  — OpenAI react hooks
scripts/
  src/seed.ts     — DB seeding script
```

See the `pnpm-workspace` skill for full monorepo conventions.
