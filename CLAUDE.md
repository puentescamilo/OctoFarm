# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

OctoFarm is a centralized farm management web application for multiple OctoPrint instances (3D printer software). It connects to each OctoPrint instance via its REST API and WebSocket, then presents a unified dashboard for monitoring and control.

License: GNU AGPL v3.

## Monorepo Structure

Three `package.json` files at different levels:

| Level | Purpose |
|---|---|
| Root `/package.json` | Dev tooling only (eslint, prettier, husky, nodemon, release-it). No runtime code here. |
| `/server/package.json` | Node.js backend — all server runtime deps live here. |
| `/client/package.json` | Webpack bundler + frontend libs. Outputs into `/server/assets/`. |

## Commands

### Setup

```sh
npm install           # Root dev tooling (eslint, husky, etc.)
npm run setup-dev     # Install both server and client deps (npm ci for each)
```

Requires a `.env` file at the repo root:

```dotenv
NODE_ENV=development
MONGO=mongodb://127.0.0.1:27017/octofarm
OCTOFARM_PORT=4000
```

### Development

```sh
npm run dev-server    # Start backend with nodemon (hot-reload), logs to console
npm run dev-client    # Watch client and rebuild on change (separate terminal)
npm run build-client  # One-shot production build of client → /server/assets/
```

> `dev-server` and `dev-client` delegate to `pnpm run dev` inside each sub-package — install pnpm globally (`npm i -g pnpm`) or replace with `cd server && npm run dev` / `cd client && npm run dev`.

The README incorrectly lists `server-dev`; the actual root script is `dev-server`.

### Tests

```sh
cd server && npm test  # Jest (--forceExit). Note: very few tests currently exist.
```

### Database migrations

```sh
cd server && npm run migration:up     # Apply pending migrations
cd server && npm run migration:down   # Roll back last migration
cd server && npm run migration:status # Show migration state
```

Migrations run automatically on server startup via `app.js` → `runMigrations()`.

### Production (PM2)

```sh
npm start          # cd server && pm2 start ecosystem.config.js
npm run restart    # pm2 restart OctoFarm
npm run stop       # pm2 stop OctoFarm
```

### Linting / Formatting

```sh
npm run prettier   # Format server + client JS in-place
```

ESLint uses `airbnb-base` + `prettier`. Config at root `.eslintrc` (if present) and inside `client/package.json`.

## Architecture

### Boot sequence

`server/app.js` → connects Mongoose → runs migrations → `ensureSystemSettingsInitiated()` → `serveOctoFarmNormally()` → registers all tasks via `TaskManager` → starts Express on `OCTOFARM_PORT`.

If MongoDB is unreachable, the server falls into a limited fallback mode (`app-fallbacks.js`) that serves a single error page so the browser doesn't get a blank response.

### Backend layers

```
Routes (server/routes/)
  └─ Services (server/services/)       ← business logic
       └─ Cache singletons (server/cache/)  ← in-memory, lazy-init
            └─ Stores (server/store/)       ← mutable state objects
                 └─ Models (server/models/) ← Mongoose schemas / MongoDB
```

**Caches** are module-level singletons accessed via `get*Cache()` functions (e.g., `getPrinterStoreCache()`, `getPrinterManagerCache()`). They are lazy-initialized on first call and reused for the lifetime of the process. Mutating state goes through the cache/store, not the DB directly.

**Server-Sent Events** replace WebSocket for browser ↔ server communication. Three SSE endpoints push data to the browser: `sse.dashboard.routes.js`, `sse.printer-manager.routes.js`, `sse.printer-monitoring.routes.js`. A fourth (`sse.events.routes.js`) is the intended future unified channel.

**WebSockets** are used only for server → OctoPrint communication (`services/octoprint/octoprint-websocket-client.service.js`). The browser never opens a WebSocket directly to OctoPrint.

### Task scheduler (`server/tasks.js`)

All periodic and one-shot background work is registered through `TaskManager` (wraps `toad-scheduler`). Task definitions live in `OctoFarmTasks` in `tasks.js`. Adding a new recurring task: define the async function, wrap it with `TaskStart(fn, preset)`, and add to `RECURRING_BOOT_TASKS`.

### Logger

`server/handlers/logger.js` exports a `Logger` class (wraps Winston). Instantiate per module with a key from `LOGGER_ROUTE_KEYS` constants — this routes log lines to the correct file (`OctoFarm.System`, `OctoFarm.Access`, `OctoFarm.Printer.OctoPrint`). Log level is controlled by the `LOG_LEVEL` env var.

### Frontend

The client is vanilla JS + jQuery + Bootstrap 4 bundled with Webpack 5. There is no SPA framework.

- `client/entry/` — one file per page; Webpack uses these as named entry points. Each entry is named after its file (without extension) and becomes a versioned `.min.js` bundle.
- `client/js/pages/` — page-specific logic, one folder per feature.
- `client/js/services/` — shared client-side services (API calls, SSE client, file management, etc.).
- `client/js/services/octoprint/` — client-side wrappers for OctoPrint API calls proxied through OctoFarm's `/octoprint/:id/` route.
- Built assets land in `server/assets/` (production) or `client/assets/` (dev watch mode).

jQuery and bootbox are externals (loaded from vendor bundles, not bundled per entry).

### OctoPrint integration

`services/octoprint/octoprint-api-client.service.js` — raw HTTP calls to OctoPrint REST API.  
`services/octoprint/octoprint-websocket-client.service.js` — persistent WebSocket connection per printer, handles reconnection.  
`services/octoprint/octoprint-websocket-message.service.js` — parses incoming OctoPrint WebSocket messages and updates the printer store.

The server proxies browser requests to OctoPrint through `middleware/octoprint-proxy.js` at `/octoprint/:id/*`, injecting the correct API key.

### Database migrations

Migration files live in `server/migrations/`, named `<timestamp>-<description>.js`. Config: `server/migrate-mongo-config.js`. Each file exports `up(db, client)` and `down(db, client)`.

## Key environment variables

| Variable | Default | Purpose |
|---|---|---|
| `MONGO` | `mongodb://127.0.0.1:27017/octofarm` | MongoDB connection string |
| `OCTOFARM_PORT` | `4000` | HTTP listen port |
| `NODE_ENV` | — | `development` / `production` / `test` |
| `LOG_LEVEL` | `info` | `info` / `debug` / `silly` |
| `SUPER_SECRET_KEY` | auto-generated | Session encryption key |
| `OCTOFARM_SITE_TITLE` | `OctoFarm` | Browser tab title |

## Docker

Two Dockerfiles:

- `Dockerfile` — standard multi-stage Alpine build; expects a separate MongoDB container.
- `monolithic.Dockerfile` — bundles MongoDB inside the image for single-container deployments.

The entrypoint (`docker/entrypoint.sh`) validates `MONGO` and `OCTOFARM_PORT` then starts via PM2.
