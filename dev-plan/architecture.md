# Platform Architecture — RN3 Webform Platform

## Overview

A monorepo platform hosting multiple React webform applications (PAMS, Fgases, and future apps)
that interact with the Reportnet3 (RN3) API for pull, push, and validation workflows.
All RN3 communication is centralized in a shared ASP.NET Core backend (BFF).
Real-time progress is delivered via SignalR. End users authenticate individually.
AI capabilities are built on top of the same backend using Semantic Kernel.

---

## Repository Structure

```
r3-webform-platform/
├── dev-plan/                        ← architecture and planning docs
├── packages/
│   └── ui/                          ← shared React components (optional, Phase 4+)
│
├── apps/
│   ├── api/                         ← ASP.NET Core Web API (BFF)
│   │   ├── Api.sln
│   │   ├── src/
│   │   │   ├── Controllers/
│   │   │   │   ├── AuthController.cs
│   │   │   │   ├── PullController.cs
│   │   │   │   ├── PushController.cs
│   │   │   │   ├── ValidationController.cs
│   │   │   │   ├── LockController.cs
│   │   │   │   └── AiController.cs
│   │   │   ├── Services/
│   │   │   │   ├── Rn3Service.cs        ← all RN3 HTTP calls, holds API key
│   │   │   │   ├── PullService.cs       ← export → poll → unzip workflow
│   │   │   │   ├── PushService.cs       ← build ZIP → import workflow
│   │   │   │   ├── ValidationService.cs ← trigger → poll validation
│   │   │   │   ├── LockService.cs       ← dataset checkout locking
│   │   │   │   └── AiService.cs         ← Semantic Kernel orchestration
│   │   │   ├── Hubs/
│   │   │   │   └── WorkflowHub.cs       ← SignalR hub for real-time progress
│   │   │   ├── Models/                  ← C# DTOs
│   │   │   ├── Configuration/
│   │   │   │   └── RN3Options.cs
│   │   │   └── Program.cs
│   │   ├── appsettings.json
│   │   └── Dockerfile
│   │
│   ├── pams/                        ← React SPA — PAMS webform (migrated)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── schema/
│   │   │   └── services/
│   │   │       └── apiClient.ts     ← generated from BFF OpenAPI spec
│   │   ├── vite.config.ts
│   │   └── Dockerfile               ← nginx serving dist/
│   │
│   └── fgases/                      ← React SPA — Fgases webform (new)
│       ├── src/
│       ├── vite.config.ts
│       └── Dockerfile
│
├── docker-compose.yml               ← local dev
├── docker-compose.prod.yml          ← production overrides
├── package.json                     ← pnpm workspaces
└── pnpm-workspace.yaml
```

> **Note on monorepo tooling:** The .NET project (`apps/api/`) has its own `.sln` and builds
> via `dotnet` CLI. The React apps build via pnpm. Docker Compose orchestrates both — each
> service has its own Dockerfile and build context. pnpm workspaces only cover `apps/pams`,
> `apps/fgases`, and `packages/*`.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + TypeScript | React 18 |
| Frontend build | Vite | 5.x |
| Frontend persistence | IndexedDB (via Dexie.js) | — |
| Backend API | ASP.NET Core Web API | .NET 9 |
| Real-time communication | SignalR | built-in |
| AI orchestration | Semantic Kernel | 1.x |
| AI abstraction | Microsoft.Extensions.AI | .NET 9 |
| HTTP client (backend) | HttpClient + IHttpClientFactory | built-in |
| API contract | OpenAPI / Swagger | — |
| TS client generation | NSwag or Kiota | — |
| Container runtime | Docker | — |
| Orchestration | Docker Compose (dev) / Kubernetes (prod) | — |
| Package manager | pnpm workspaces (frontend only) | 9.x |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                  │
│                                                                 │
│   ┌─────────────────┐        ┌──────────────────┐              │
│   │   pams (React)  │        │  fgases (React)  │   ...        │
│   │                 │        │                  │              │
│   │  IndexedDB      │        │  IndexedDB       │              │
│   │  (working copy) │        │  (working copy)  │              │
│   └────────┬────────┘        └────────┬─────────┘              │
└────────────┼────────────────────────┼─────────────────────────┘
             │ HTTP + SignalR          │ HTTP + SignalR
             ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ASP.NET Core BFF (api/)                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ PullService  │  │  PushService │  │  ValidationService   │  │
│  │  trigger     │  │  build ZIP   │  │  trigger + poll      │  │
│  │  poll        │  │  import      │  │  return results      │  │
│  │  unzip       │  └──────────────┘  └──────────────────────┘  │
│  └──────────────┘                                               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────────────────────────┐    │
│  │ LockService  │  │  WorkflowHub (SignalR)               │    │
│  │ in-memory    │  │  real-time progress + heartbeat      │    │
│  │ ConcurrentDi │  └──────────────────────────────────────┘    │
│  └──────────────┘                                               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  AiService (Semantic Kernel)                             │   │
│  │  - validation explanation  - data entry suggestions      │   │
│  │  - anomaly detection       - natural language queries    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  IMemoryCache — schemas, codelists, metadata (TTL)       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Rn3Service — HttpClient wrapper                         │   │
│  │  RN3 API key + user tokens stored here only              │   │
│  └──────────────────────────┬─────────────────────────────┘    │
└───────────────────────────┼─────────────────────────────────────┘
                             │ HTTPS + ApiKey / Bearer
                             ▼
              ┌──────────────────────────────┐
              │  Reportnet3 API (RN3)        │
              │  api.reportnet.europa.eu     │
              └──────────────────────────────┘
```

---

## Authentication

End users authenticate individually. The BFF manages RN3 tokens server-side.

```
Browser                          BFF                              RN3
  │                                │                                │
  │── POST /api/auth/login ──────►│                                │
  │   {username, password}         │── POST /user/generateToken ──►│
  │                                │◄── RN3 token ─────────────────│
  │                                │  store token in user session   │
  │◄── session cookie / JWT ──────│                                │
  │                                │                                │
  │── any API call ──────────────►│                                │
  │   (with session cookie)        │── forward with RN3 token ────►│
```

- Users never see or handle RN3 API keys or tokens
- BFF session can be in-memory (single instance) or Redis-backed (multi-instance)
- RN3 custodian API key is used by BFF for service-level operations only
- Per-user RN3 tokens are used for operations scoped to that user's permissions

---

## Dataset Checkout Locking

Prevents multiple users from editing the same dataset simultaneously.
This is **pessimistic locking** — the dataset is locked on pull and released on push.

### Lock model

```csharp
public class DatasetLock
{
    public string DatasetKey { get; set; }    // "{dataflowId}:{datasetId}"
    public string UserId { get; set; }
    public string UserEmail { get; set; }
    public DateTime LockedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime LastHeartbeat { get; set; }
}
```

### Lock lifecycle

```
User A: POST /api/pull/{dataflowId}/{datasetId}
  → LockService: no existing lock → acquire lock for User A
  → trigger RN3 export, return data
  → User A edits...
  → SignalR heartbeat every 60s refreshes lock

User B: POST /api/pull/{dataflowId}/{datasetId}
  → LockService: LOCKED by User A
  → return 409 Conflict with lock details

User A: POST /api/push/{dataflowId}/{datasetId}
  → verify User A owns the lock
  → push to RN3 → success → release lock

User B: POST /api/pull/{dataflowId}/{datasetId}
  → LockService: no lock → acquire, proceed
```

### Edge cases

| Scenario | Solution |
|---|---|
| User locks and closes browser | SignalR heartbeat — no ping for 5 min → auto-release |
| User locks and goes home | TTL expiry — lock expires after configurable duration (e.g. 8h) |
| User wants to abandon edits | Explicit unlock: `DELETE /api/lock/{dataflowId}/{datasetId}` |
| Admin needs to force-unlock | Force release endpoint (admin role only) |
| User wants read-only view | `GET /api/pull/{dataflowId}/{datasetId}?readonly=true` — no lock acquired |
| Push fails | Keep lock — user can retry without re-pulling |

### Lock service interface

```csharp
public interface ILockService
{
    LockResult TryAcquire(string datasetKey, string userId, string userEmail);
    bool Release(string datasetKey, string userId);
    bool ForceRelease(string datasetKey);  // admin only
    DatasetLock? GetLock(string datasetKey);
    void RefreshHeartbeat(string datasetKey, string userId);
    IReadOnlyList<DatasetLock> GetAllLocks();  // admin dashboard
}
```

### Storage strategy

| Phase | Implementation | Notes |
|---|---|---|
| Initial | `ConcurrentDictionary<string, DatasetLock>` | Simple, sufficient for single-instance BFF |
| Multi-instance | Redis with distributed locks | Swap implementation behind `ILockService` interface |

### Frontend UI for locked datasets

```
┌──────────────────────────────────────────┐
│  Dataset 40468 is currently locked       │
│                                          │
│  Locked by: alice@eea.europa.eu          │
│  Since: 12 Jun 2026, 14:32              │
│                                          │
│  [View Read-Only]  [Request Release]     │
└──────────────────────────────────────────┘
```

---

## Real-Time Communication (SignalR)

SignalR replaces the browser-side polling and progress estimation currently in `rn3Api.ts`.

### WorkflowHub

```csharp
public class WorkflowHub : Hub
{
    // Client → Server: heartbeat to keep lock alive
    public async Task Heartbeat(string datasetKey) { ... }

    // Server → Client methods (called from services):
    // - ProgressUpdate(step, message, percentage)
    // - JobStatusChanged(step, status)
    // - WorkflowComplete(step, data)
    // - WorkflowError(step, error)
    // - LockReleased(datasetKey, reason)
}
```

### Pull workflow with SignalR

```
Browser                          BFF                              RN3
  │                                │                                │
  │── POST /api/pull ────────────►│                                │
  │◄── 202 Accepted (jobId) ──────│                                │
  │                                │── trigger export ────────────►│
  │◄── SignalR: progress 0%  ─────│                                │
  │◄── SignalR: "polling 3/60" ───│── poll ───────────────────────►│
  │◄── SignalR: progress 50% ─────│◄── IN_PROGRESS ───────────────│
  │◄── SignalR: "downloading" ────│── download ZIP ───────────────►│
  │◄── SignalR: data (JSON) ──────│  extract JSON                  │
  │                                │                                │
  │  store in IndexedDB            │  nothing stored (stateless)    │
  │  user edits...                 │                                │
  │                                │                                │
  │── SignalR heartbeat (60s) ───►│  refresh lock                  │
  │── SignalR heartbeat (60s) ───►│  refresh lock                  │
  │                                │                                │
  │── POST /api/push (records) ──►│                                │
  │◄── 202 Accepted ──────────────│                                │
  │                                │── build ZIP, import ─────────►│
  │◄── SignalR: progress ─────────│── poll ───────────────────────►│
  │◄── SignalR: "FINISHED" ───────│◄── done ──────────────────────│
  │                                │── release lock                 │
```

---

## Data Storage Strategy

| Data | Where | Why |
|---|---|---|
| **Working copy** (pulled dataset, user edits) | Browser IndexedDB (Dexie.js) | Per-user, per-session. Survives page refresh. No server-side state for user data |
| **Schemas, codelists, metadata** | BFF IMemoryCache (TTL 15-60 min) | Shared, read-only, rarely changes. Saves redundant RN3 calls |
| **User session / RN3 tokens** | BFF in-memory (or Redis for multi-instance) | Server-side only, never exposed to browser |
| **Dataset locks** | BFF ConcurrentDictionary (or Redis for multi-instance) | Lightweight, expires via heartbeat + TTL |
| **Validation results** | Browser IndexedDB | Per-user, associated with their working copy |

### Why NOT a server-side database for user data

- Each pull can be large — 10 users x 5 datasets = significant storage
- Cleanup complexity (when to evict?)
- Makes BFF stateful, harder to scale horizontally
- IndexedDB handles tens/hundreds of MB per origin, survives refresh
- Each user's browser is their own isolated workspace

### When to add a database (future)

If you later need:
- Collaborative editing (multiple users on same dataset)
- Audit trail (who changed what, when)
- Cross-device draft persistence

Then add PostgreSQL. Not before.

---

## RN3 Workflow Ownership

All complex RN3 workflows are owned by the BFF, not the browser.

### Pull workflow

```
POST /api/{dataflowId}/{datasetId}/pull
  → LockService: acquire lock (or fail with 409)
  → Rn3Service: POST /dataset/v3/etlExport/{datasetId}
  → PullService: poll orchestratorJobUrl until FINISHED (SignalR progress)
  → PullService: download ZIP, extract JSON
  → SignalR: send clean dataset to frontend
```

### Push workflow

```
POST /api/{dataflowId}/{datasetId}/push
  body: records[]
  → LockService: verify caller owns lock
  → PushService: build ZIP of CSVs
  → Rn3Service: POST /dataset/v1/importFileData/{datasetId} (SignalR progress)
  → PushService: poll until FINISHED
  → LockService: release lock
  → SignalR: send result to frontend
```

### Validation workflow

```
POST /api/{dataflowId}/{datasetId}/validate
  → Rn3Service: POST /validation/v1/runValidation/{datasetId}
  → ValidationService: poll until FINISHED (SignalR progress)
  → Rn3Service: GET validation results
  → SignalR: send results to frontend
```

---

## API Contract (OpenAPI)

The BFF exposes a Swagger/OpenAPI spec. Frontend TypeScript clients are **generated** from it,
eliminating the need for a shared `rn3-types` package.

### Generation workflow

```
BFF (Swagger) ──► NSwag / Kiota ──► apps/pams/src/services/apiClient.ts
                                  ──► apps/fgases/src/services/apiClient.ts
```

This runs as a build step or on-demand script. Both apps always have type-safe clients
matching the current BFF contract.

---

## AI Capabilities (Semantic Kernel)

### Phase 1 — Validation assistant
AI explains validation errors in plain language, suggests corrections.

### Phase 2 — Data entry assistance
Based on historical submissions, suggest plausible field values.

### Phase 3 — Anomaly detection
Flag records with statistically unusual values before push.

### Phase 4 — Natural language queries
"Show all PAMs with estimated impact above 500 kt CO2eq after 2030."

### Phase 5 — Report generation
Generate a narrative summary of a submission for human review.

---

## Security

- RN3 API key stored in backend environment variables only
- Per-user RN3 tokens stored in BFF session, never exposed to browser
- Frontend apps have no RN3 credentials — only `VITE_API_URL`
- BFF validates requests and verifies lock ownership before forwarding to RN3
- CORS configured to allow only known frontend origins
- SignalR connections authenticated via the same session cookie/JWT

---

## Environment Configuration

### Backend (api/)
```
RN3__ApiUrl=https://api.reportnet.europa.eu
RN3__ApiKey=<secret>                         # custodian service key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
LOCK__DefaultTtlHours=8
LOCK__HeartbeatTimeoutMinutes=5
AI__Provider=AzureOpenAI
AI__AzureOpenAI__Endpoint=<endpoint>
AI__AzureOpenAI__Key=<secret>
```

### Frontend apps
```
VITE_API_URL=http://localhost:3000   # dev
VITE_API_URL=https://api.your-domain # prod
```

---

## Container Strategy

### Local development
```yaml
# docker-compose.yml
services:
  api:
    build: ./apps/api
    ports: ["3000:3000"]
    environment:
      - RN3__ApiUrl=https://sandbox-api.reportnet.europa.eu
      - RN3__ApiKey=${RN3_API_KEY}
      - ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

  pams:
    build: ./apps/pams
    ports: ["5173:80"]
    environment:
      - VITE_API_URL=http://localhost:3000

  fgases:
    build: ./apps/fgases
    ports: ["5174:80"]
    environment:
      - VITE_API_URL=http://localhost:3000
```

### Production
- One container image per app
- BFF behind a reverse proxy (nginx / Traefik) with WebSocket support for SignalR
- Frontend apps served as static files from nginx containers
- Secrets via environment variables or Kubernetes Secrets
- Health check endpoints: `GET /health`, `GET /health/ready`
- If scaling BFF to multiple instances: add Redis for sessions + locks
