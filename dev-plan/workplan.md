# Work Plan — RN3 Webform Platform

## Phases Overview

| Phase | Scope | Goal |
|---|---|---|
| 1 | Monorepo + local dev | All apps build and run locally |
| 2 | ASP.NET Core BFF | API with auth, locking, pull/push/validate, SignalR |
| 3 | PAMS migration | PAMS talks to BFF only, IndexedDB for local storage |
| 4 | Fgases app | Fresh React app for Fgases using BFF |
| 5 | CI/CD + containers | Docker images, pipelines, deployment |
| 6 | AI capabilities | Semantic Kernel integration |

---

## Phase 1 — Monorepo + Local Dev

**Goal:** All three apps exist and run locally with `pnpm dev` (frontends) and `dotnet run` (API).
Docker Compose comes later in Phase 5.

### 1.1 — Initialize pnpm workspaces

- [ ] Add `package.json` at root with workspaces: `["apps/pams", "apps/fgases", "packages/*"]`
- [ ] Add `pnpm-workspace.yaml`
- [ ] Add root `.gitignore` covering node_modules, dist, bin, obj, .env*.local

### 1.2 — Scaffold `apps/api`

- [ ] `dotnet new webapi -o apps/api`
- [ ] Add `apps/api/Api.sln` (solution file at api level, outside pnpm scope)
- [ ] Verify `dotnet run` starts on port 3000
- [ ] Add `GET /health` endpoint returning 200
- [ ] Add `.gitignore` for bin/obj

### 1.3 — Move PAMS into monorepo

- [ ] Copy `govreg-annexi-webforms/FRONT` → `apps/pams`
- [ ] Update `package.json` name to `@eea/pams`
- [ ] Verify `cd apps/pams && pnpm dev` still runs
- [ ] Confirm PAMS still works against RN3 directly (migration in Phase 3)

### 1.4 — Scaffold `apps/fgases`

- [ ] `pnpm create vite apps/fgases --template react-ts`
- [ ] Update `package.json` name to `@eea/fgases`
- [ ] Add MUI dependency (same version as PAMS)
- [ ] Add placeholder home page

### 1.5 — Verify everything runs

- [ ] `pnpm install` from root succeeds
- [ ] `pnpm --filter @eea/pams dev` starts PAMS on 5173
- [ ] `pnpm --filter @eea/fgases dev` starts Fgases on 5174
- [ ] `cd apps/api && dotnet run` starts API on 3000
- [ ] `/health` endpoint responds

**Deliverable:** Three apps running locally, all from one repo.

---

## Phase 2 — ASP.NET Core BFF

**Goal:** BFF implements auth, locking, pull, push, validate with SignalR progress.
Tested against RN3 sandbox.

### 2.1 — Project structure and configuration

- [ ] Add NuGet packages: `Swashbuckle.AspNetCore`, `System.IO.Compression`
- [ ] Create folder structure: `Controllers/`, `Services/`, `Models/`, `Hubs/`, `Configuration/`
- [ ] Create `RN3Options` settings class bound to `RN3` section in `appsettings.json`
- [ ] Register `IHttpClientFactory` with named client `"rn3"` (base URL + default ApiKey header)
- [ ] Add `appsettings.Development.json` (gitignored) with sandbox credentials
- [ ] Configure CORS to allow frontend origins from config

### 2.2 — Authentication

- [ ] `AuthController`: `POST /api/auth/login` — accepts username/password
- [ ] Forward credentials to RN3 `POST /user/generateToken`
- [ ] Store RN3 token in server-side session (keyed by session cookie or JWT)
- [ ] `POST /api/auth/logout` — clear session
- [ ] `GET /api/auth/me` — return current user info
- [ ] Auth middleware: reject unauthenticated requests (except /health, /auth/*)
- [ ] Test: login with RN3 sandbox credentials, verify session persists

### 2.3 — SignalR hub

- [ ] Add `Microsoft.AspNetCore.SignalR` (built-in)
- [ ] Create `WorkflowHub` at `/hubs/workflow`
- [ ] Implement `Heartbeat(datasetKey)` client-to-server method
- [ ] Helper method: send progress to specific connection (`ProgressUpdate`, `WorkflowComplete`, `WorkflowError`)
- [ ] Configure SignalR in `Program.cs` with auth requirement
- [ ] Test: connect from browser, send/receive messages

### 2.4 — Dataset checkout locking

- [ ] Create `DatasetLock` model
- [ ] Create `ILockService` interface
- [ ] Implement `InMemoryLockService` using `ConcurrentDictionary`
- [ ] Register as singleton in DI
- [ ] Heartbeat refresh: `WorkflowHub.Heartbeat` calls `ILockService.RefreshHeartbeat`
- [ ] Background service: check for expired locks every 60s (no heartbeat for 5 min → release)
- [ ] `LockController`:
  - `GET /api/lock/{dataflowId}/{datasetId}` — check lock status
  - `DELETE /api/lock/{dataflowId}/{datasetId}` — release own lock
  - `DELETE /api/lock/{dataflowId}/{datasetId}/force` — admin force-release
  - `GET /api/locks` — list all active locks (admin)
- [ ] Test: acquire lock, verify second user gets 409, release, verify second user succeeds

### 2.5 — `Rn3Service` (low-level RN3 HTTP wrapper)

- [ ] Inject `IHttpClientFactory`, resolve named client `"rn3"`
- [ ] Use per-user RN3 token from session for requests
- [ ] `GetSimpleSchema(datasetId, dataflowId)` → schema JSON
- [ ] `TriggerEtlExport(datasetId, dataflowId)` → returns pollingUrl
- [ ] `PollJobStatus(jobUrl)` → polls until FINISHED or FAILED, yields status updates
- [ ] `DownloadAndExtractZip(downloadUrl)` → returns extracted JSON string
- [ ] `TriggerValidation(datasetId)`
- [ ] `GetValidationResults(datasetId)`
- [ ] `ImportFileData(datasetId, zipBytes)` → returns pollingUrl
- [ ] `ExportDatasetFile(datasetId)` → returns ZIP blob (CSV export)
- [ ] Test each method against RN3 sandbox individually

### 2.6 — `PullService`

- [ ] Inject `Rn3Service`, `ILockService`, `WorkflowHub`
- [ ] `PullAsync(dataflowId, datasetId, userId, connectionId)`:
  1. Acquire lock (fail with 409 if locked)
  2. Trigger ETL export
  3. Poll with SignalR progress updates to caller's connectionId
  4. Download and extract ZIP
  5. Return deserialized data via SignalR `WorkflowComplete`
- [ ] `PullReadOnlyAsync(...)` — same but without lock acquisition
- [ ] Handle timeout (max poll attempts) and RN3 failure with `WorkflowError`
- [ ] Test: full pull cycle against sandbox with SignalR client

### 2.7 — `PushService`

- [ ] Inject `Rn3Service`, `ILockService`, `WorkflowHub`
- [ ] `PushAsync(dataflowId, datasetId, records, userId, connectionId)`:
  1. Verify caller owns the lock
  2. Build ZIP of CSVs (one file per table, matching RN3 schema field order)
  3. Call `Rn3Service.ImportFileData`
  4. Poll with SignalR progress
  5. On success: release lock, send `WorkflowComplete`
- [ ] Test: push sample data to sandbox dataset

### 2.8 — `ValidationService`

- [ ] Inject `Rn3Service`, `WorkflowHub`
- [ ] `ValidateAsync(dataflowId, datasetId, connectionId)`:
  1. Trigger validation job
  2. Poll with SignalR progress
  3. Fetch validation results
  4. Send results via SignalR `WorkflowComplete`
- [ ] Test: trigger validation on sandbox dataset, verify results

### 2.9 — Controllers

- [ ] `PullController`:
  - `POST /api/{dataflowId}/{datasetId}/pull` — full pull with lock
  - `POST /api/{dataflowId}/{datasetId}/pull?readonly=true` — pull without lock
  - `GET /api/{dataflowId}/{datasetId}/schema` — cached schema
- [ ] `PushController`:
  - `POST /api/{dataflowId}/{datasetId}/push` — push records
- [ ] `ValidationController`:
  - `POST /api/{dataflowId}/{datasetId}/validate` — trigger validation
- [ ] All long-running endpoints return `202 Accepted` with a jobId; results delivered via SignalR
- [ ] Add Swagger / OpenAPI annotations on all endpoints
- [ ] Verify Swagger UI at `http://localhost:3000/swagger`

### 2.10 — OpenAPI client generation

- [ ] Add NSwag or Kiota tooling to generate TypeScript client from Swagger spec
- [ ] Script: `generate-client.sh` → outputs `apiClient.ts` into each frontend app
- [ ] Verify generated client compiles and has correct types

**Deliverable:** Swagger UI with working endpoints. Full pull/push/validate cycle works
against RN3 sandbox via Swagger or a test SignalR client.

---

## Phase 3 — PAMS Migration

**Goal:** PAMS uses BFF exclusively. No direct RN3 calls from browser.

### 3.1 — SignalR client setup

- [ ] Add `@microsoft/signalr` package to PAMS
- [ ] Create `useSignalR` hook — connects to `/hubs/workflow`, handles reconnection
- [ ] Create `useWorkflowProgress` hook — listens for progress/complete/error events
- [ ] Heartbeat: send `Heartbeat(datasetKey)` every 60s while dataset is locked

### 3.2 — Replace API layer

- [ ] Copy generated `apiClient.ts` from Phase 2.10 into `apps/pams/src/services/`
- [ ] Replace all `rn3Api.*` calls with `apiClient.*` calls
- [ ] Replace `useAuth` context:
  - Login now calls `POST /api/auth/login` on BFF
  - No more `VITE_RN3_*` env vars
  - Connection check calls `GET /api/auth/me`
- [ ] Remove `rn3Api.ts`
- [ ] Remove `AuthContext.tsx` (replace with new BFF-aware auth context)
- [ ] Remove `jszip` dependency
- [ ] Remove all timing stats code (SmartProgressBar estimation) — SignalR gives real progress

### 3.3 — IndexedDB for local storage

- [ ] Add `dexie` package
- [ ] Create `db.ts` with Dexie schema: `pulledData`, `validationResults`, `userSettings`
- [ ] On pull complete (SignalR `WorkflowComplete`): store dataset in IndexedDB
- [ ] On app load: hydrate from IndexedDB if data exists (replace localStorage cache)
- [ ] On push success: clear pulled data from IndexedDB
- [ ] Remove all `localStorage.getItem/setItem` for data, config IDs, API keys, timing stats

### 3.4 — Update PullPage

- [ ] Remove browser-side polling logic
- [ ] Use `useWorkflowProgress` for real-time progress display
- [ ] Show lock status (locked by me / locked by someone else / unlocked)
- [ ] Read-only mode when dataset is locked by another user
- [ ] Pull validation uses same SignalR pattern

### 3.5 — Update PushPage

- [ ] Remove push API key text field (BFF handles auth)
- [ ] Remove token generation UI (BFF handles tokens)
- [ ] Remove manual file import (or route through BFF)
- [ ] Push sends records to BFF via `POST /api/{dataflowId}/{datasetId}/push`
- [ ] Progress via SignalR instead of polling
- [ ] Keep "Download ZIP" as a local-only feature (no BFF needed, keep `buildZip` for local export)

### 3.6 — Update remaining components

- [ ] `ValidationWorkflow.tsx` — use BFF validation endpoint + SignalR progress
- [ ] `DataOpsPage.tsx` — update orchestration to use new hooks
- [ ] `SidebarMenu.tsx` — show lock status indicator
- [ ] Remove all `import.meta.env.VITE_RN3_*` references

### 3.7 — Configuration

- [ ] `.env.development`: only `VITE_API_URL=http://localhost:3000`
- [ ] `.env.production`: only `VITE_API_URL=https://api.your-domain`
- [ ] Remove all `VITE_RN3_*` env vars

### 3.8 — End-to-end testing

- [ ] Login via BFF
- [ ] Pull dataset → verify lock acquired → data in IndexedDB
- [ ] Second browser: verify dataset shows as locked, read-only pull works
- [ ] Edit records in PAMS UI
- [ ] Push → verify lock released
- [ ] Second browser: verify dataset now unlockable
- [ ] Trigger validation → verify results display
- [ ] Close tab → verify lock auto-releases after heartbeat timeout

**Deliverable:** PAMS fully operational via BFF. No RN3 credentials in browser.
Multi-user locking works. Real-time progress via SignalR.

---

## Phase 4 — Fgases App

**Goal:** Working Fgases webform for a first reporting table.

### 4.1 — Discovery spike (timeboxed: 1 week)

- [ ] Review existing Fgases Angular app and XSD schemas in `Fgases/angular/schema/`
- [ ] Document the Fgases data model: tables, fields, relationships, codelists
- [ ] Identify the simplest table/dataset to implement first
- [ ] Pull a Fgases dataset via BFF Swagger to understand the actual data shape
- [ ] Write a brief data model document in `dev-plan/fgases-data-model.md`

### 4.2 — Shared UI components decision

- [ ] List components reusable from PAMS (DataTable, SmartProgressBar, ValidationResultsDisplay, etc.)
- [ ] If 3+ components are reusable: extract to `packages/ui`, update PAMS imports
- [ ] If fewer: copy needed components into `apps/fgases` directly
- [ ] Document decision in this file

### 4.3 — Fgases app scaffold

- [ ] Add `@microsoft/signalr`, `dexie`, MUI to `apps/fgases`
- [ ] Copy generated `apiClient.ts` from BFF
- [ ] Create auth context (same pattern as migrated PAMS)
- [ ] Create `useSignalR` and `useWorkflowProgress` hooks (or import from `packages/ui`)
- [ ] Create IndexedDB schema with Dexie

### 4.4 — Fgases-specific screens

- [ ] Login page
- [ ] Pull page — reuses BFF pull endpoint, shows lock status
- [ ] Data entry form/table for first Fgases dataset
- [ ] Push page
- [ ] Validation results page

### 4.5 — Verify end-to-end

- [ ] Pull Fgases dataset from RN3 sandbox
- [ ] Edit records
- [ ] Push back
- [ ] Validate
- [ ] Verify locking works (same BFF, different app)

**Deliverable:** Fgases app can pull, edit, push, and validate at least one dataset
through the shared BFF.

---

## Phase 5 — CI/CD + Containers

**Goal:** Automated build, test, and deployment pipeline.

### 5.1 — Dockerfiles

- [ ] `apps/api/Dockerfile` — multi-stage: `dotnet publish` → `mcr.microsoft.com/dotnet/aspnet` runtime
- [ ] `apps/pams/Dockerfile` — multi-stage: `pnpm build` → nginx serving `dist/`
- [ ] `apps/fgases/Dockerfile` — same pattern as PAMS
- [ ] Nginx config for SPAs: fallback to `index.html` for client-side routing

### 5.2 — Docker Compose

- [ ] `docker-compose.yml` — three services (api, pams, fgases)
- [ ] `docker-compose.override.yml` — dev-specific: volume mounts, hot reload
- [ ] `.env.example` — document all required env vars
- [ ] Verify `docker compose up --build` starts everything cleanly

### 5.3 — CI pipeline

- [ ] Backend: `dotnet build` → `dotnet test` → `dotnet publish` → Docker build + push
- [ ] Frontend: `pnpm install` → `pnpm build` → Docker build + push
- [ ] OpenAPI client generation check: verify generated client is up to date
- [ ] Run on push to main and on PRs

### 5.4 — Testing

- [ ] Backend unit tests: `Rn3Service` (mocked HttpClient), `LockService`, `PullService`
- [ ] Backend integration tests: against RN3 sandbox (can run on schedule, not every PR)
- [ ] Frontend: smoke tests that apiClient types match BFF contract
- [ ] Add test tasks to CI pipeline

### 5.5 — Deployment

- [ ] Container registry setup
- [ ] Kubernetes manifests or Docker Swarm stack (based on infra decision)
- [ ] Secrets management (Kubernetes Secrets or environment injection)
- [ ] Reverse proxy config: route `/api/*` and `/hubs/*` to BFF, static files to nginx
- [ ] Health check probes: `/health` (liveness), `/health/ready` (readiness)

**Deliverable:** Push to main → automatic build → images in registry → deployable.

---

## Phase 6 — AI Capabilities

**Goal:** Semantic Kernel integrated, validation assistant working end-to-end.

### 6.1 — Semantic Kernel setup

- [ ] Add NuGet: `Microsoft.SemanticKernel`, `Microsoft.Extensions.AI`
- [ ] Configure AI provider (Azure OpenAI or OpenAI) in `appsettings.json`
- [ ] Register `Kernel` in DI container
- [ ] Add `AiController`: `POST /api/ai/ask`
- [ ] Test: simple prompt roundtrip via Swagger

### 6.2 — Validation assistant

- [ ] Create `ValidationPlugin` — takes validation errors + schema context → plain-language explanation
- [ ] `POST /api/{dataflowId}/{datasetId}/validate/explain` — accepts validation results, returns AI explanation
- [ ] Frontend (both apps): add "Explain errors" button next to validation results
- [ ] Stream AI response via SignalR for better UX

### 6.3 — Data entry suggestions

- [ ] Create `Rn3DataPlugin` — exposes dataset schema and sample records to the AI
- [ ] `POST /api/{dataflowId}/{datasetId}/ai/suggest` — returns suggested field values
- [ ] Frontend: integrate suggestions in data entry forms

**Deliverable:** Users can click "Explain errors" and get a human-readable AI explanation.

---

## Definition of Done (per phase)

- All checklist items completed
- No RN3 credentials in any frontend bundle
- Manual test against RN3 sandbox passes
- Code reviewed and merged to main branch

---

## Open Questions

- Which RN3 environment to use for development? (sandbox vs test)
- Lock TTL duration: 8h default — is this appropriate for your workflow?
- UI framework for Fgases: same Material UI as PAMS, or different?
- AI provider: Azure OpenAI or OpenAI directly?
- Kubernetes or Docker Swarm for production?
- Container registry: self-hosted or cloud (ACR, ECR, GHCR)?
- Do users need different RN3 permission levels, or does everyone get the same access?
