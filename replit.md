# ProValidator

AI-powered fake image and deepfake video detection platform with a cyberpunk/glassmorphism UI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/provalidator run dev` — run the frontend (Vite)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, framer-motion, recharts, wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- File uploads: multer (api-server)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/provalidator/` — React+Vite frontend, served at `/`
- `artifacts/api-server/` — Express API server, served at `/api`
- `lib/db/` — Drizzle ORM schema + client (`detectionsTable`)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/api-client-react/` — Orval-generated React Query hooks

## Architecture decisions

- Contract-first API: OpenAPI spec drives both Zod validation on the server and React Query hooks on the client via Orval codegen.
- File uploads bypass generated hooks — frontend uses raw `fetch + FormData` to POST to `/api/detect-image` and `/api/detect-video`.
- Detection is fully algorithmic/heuristic (no external AI API needed); runs locally in Node.js.
- All detection history persists to PostgreSQL via Drizzle ORM (`detections` table).
- Dark theme only — CSS variables default to cyberpunk dark palette, `.dark` class mirrors same values.

## Product

- **Home**: Animated particle canvas hero, live stats counters (images/videos analyzed, AI vs real).
- **Image Detector**: Drag-and-drop upload, scanning animation, radial progress confidence results.
- **Video Detector**: Video upload with frame extraction display, deepfake probability scoring.
- **History**: Filterable/searchable table with Recharts pie + bar analytics, per-entry delete.
- **About**: Detection workflow steps for image & video, AI technology stack cards.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm run typecheck:libs` before `pnpm --filter @workspace/api-server run typecheck` — the DB lib must be rebuilt after schema changes.
- File upload routes use multer; do NOT put multipart requestBody in the OpenAPI spec (causes TS errors in Zod).
- The frontend uses `import.meta.env.BASE_URL` as the prefix for all API fetch calls.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
