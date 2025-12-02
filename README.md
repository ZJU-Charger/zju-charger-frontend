# Frontend (Next.js + shadcn)

This directory hosts the Next.js App Router frontend for ZJU Charger. The UI mirrors the old React/Vite Leaflet page but is rebuilt with modern tooling:

- **Framework**: Next.js 16 (App Router, TypeScript, pnpm).
- **UI Layer**: shadcn/ui + Tailwind CSS + Supabase theme, Lucide icons.
- **Visualization**: Apache ECharts 5 + `echarts-extension-amap` for the Gaode basemap.
- **State/Utilities**: React hooks (watchlist, auto-refresh, realtime location), custom geo/time helpers.

## Getting Started

```bash
pnpm install
cp .env.local.example .env.local  # create if missing
echo "NEXT_PUBLIC_AMAP_KEY=<your-amap-key>" >> .env.local
# optionally NEXT_PUBLIC_API_BASE=https://your-api-domain
pnpm dev
```

Open <http://localhost:3000> to view the app. All main components live under `src/components` and `src/hooks`.

## Build & Deploy

- **Static build / self hosting**

  ```bash
  pnpm build
  pnpm start   # serves the production build via Next.js server
  ```

- **Vercel**: connect the repo, set build command `pnpm build`, output `.next`, and configure env vars (`NEXT_PUBLIC_AMAP_KEY`, `NEXT_PUBLIC_API_BASE`). Enable “Git submodules” if deploying from the root repo.
- **Cloudflare Pages**:
  - Pure static export: `pnpm next build && pnpm next export` with output `out/`.
  - SSR/Edge: install `@cloudflare/next-on-pages`, add `pnpm run cf:build` and use `.vercel/output/static` as the output directory.

## Environment Variables

- `NEXT_PUBLIC_AMAP_KEY` (required): Gaode Web JS SDK key. Without it the map will show an error banner.
- `NEXT_PUBLIC_API_BASE` (optional): API origin for FastAPI backend. Leave empty when frontend and backend share the same domain.
- `NEXT_PUBLIC_REFRESH_INTERVAL` (optional): Frontend auto-refresh interval in seconds. When set, overrides `/api/config`’s `fetch_interval`.

All variables with `NEXT_PUBLIC_` prefix are exposed to the browser and must be set per environment (`.env.local`, `.env.production`, or deployment dashboards).

## Tech Stack Summary

- Next.js 16, TypeScript, pnpm
- shadcn/ui (Supabase preset), Tailwind CSS, Lucide icons
- Apache ECharts + `echarts-extension-amap`
- React hooks for watchlist, providers, auto-refresh, realtime geolocation (via `navigator.geolocation.watchPosition`)

PRs and customizations should live in this folder when the frontend is used as a submodule. Remember to run `pnpm lint` (Biome) before committing.
