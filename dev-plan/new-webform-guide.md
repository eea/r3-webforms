# Guide: Creating a New Webform Application

This is a step-by-step guide for adding a new webform to the r3-webform-platform.
Follow every step in order. Do not skip steps. Verify each step before moving to the next.

---

## Prerequisites

Before starting, ensure:

- [ ] The BFF (`apps/api`) is running with auth, locking, pull/push/validate, and SignalR working
- [ ] You have the **dataflow ID** and **dataset ID** for the new webform's RN3 dataset
- [ ] You have RN3 sandbox credentials to test against
- [ ] You have pulled the dataset at least once via the BFF Swagger UI to understand the data shape

---

## Step 1 — Understand the Data Model

Before writing any code, document the data model.

- [ ] Pull the dataset schema via `GET /api/{dataflowId}/{datasetId}/schema` on the BFF
- [ ] List all tables, their fields, field types, and any codelist references
- [ ] Identify relationships between tables (parent-child, foreign keys)
- [ ] Pull actual data via Swagger `POST /api/{dataflowId}/{datasetId}/pull?readonly=true` and inspect the JSON structure
- [ ] Note any fields that need special UI treatment (dropdowns from codelists, multiselect, date pickers, large text areas, read-only calculated fields)
- [ ] Create `dev-plan/{app-name}-data-model.md` documenting all of the above

**Output:** A data model document that will drive all UI decisions.

---

## Step 2 — Scaffold the React App

```bash
# From repository root
pnpm create vite apps/{app-name} --template react-ts
```

- [ ] Update `apps/{app-name}/package.json`:
  - Set `"name": "@eea/{app-name}"`
  - Verify it's picked up by pnpm workspaces
- [ ] Install dependencies:
  ```bash
  cd apps/{app-name}
  pnpm add @mui/material @mui/icons-material @emotion/react @emotion/styled
  pnpm add @microsoft/signalr dexie
  pnpm add axios
  ```
- [ ] Verify the app starts: `pnpm dev` → opens on an available port
- [ ] Add to root scripts if desired: `"dev:{app-name}": "pnpm --filter @eea/{app-name} dev"`

---

## Step 3 — Copy the Generated API Client

The BFF exposes an OpenAPI spec. The TypeScript client is generated from it.

- [ ] Run the client generation script: `./generate-client.sh` (or copy from an existing app)
- [ ] Place `apiClient.ts` in `apps/{app-name}/src/services/apiClient.ts`
- [ ] Verify it compiles — this gives you type-safe access to all BFF endpoints

> If the generation script doesn't exist yet, copy `apiClient.ts` from `apps/pams/src/services/`
> as a starting point. It is the same BFF, so the same client works.

---

## Step 4 — Set Up Core Infrastructure

Copy these from an existing app (e.g. `apps/pams`) and adapt:

### 4.1 — Environment config

- [ ] Create `apps/{app-name}/.env.development`:
  ```
  VITE_API_URL=http://localhost:3000
  ```
- [ ] Create `apps/{app-name}/.env.production`:
  ```
  VITE_API_URL=https://api.your-domain
  ```
- [ ] **Do NOT add any `VITE_RN3_*` variables.** The app never talks to RN3 directly.

### 4.2 — Auth context

- [ ] Copy or reference the auth context pattern from PAMS
- [ ] It should:
  - Call `POST /api/auth/login` on the BFF
  - Call `GET /api/auth/me` to check session
  - Call `POST /api/auth/logout`
  - Provide `isAuthenticated`, `user`, `login()`, `logout()` to the app
- [ ] Wrap `<App>` in `<AuthProvider>`

### 4.3 — SignalR hook

- [ ] Copy `useSignalR` hook from PAMS
- [ ] It should:
  - Connect to `{VITE_API_URL}/hubs/workflow` on login
  - Disconnect on logout
  - Auto-reconnect on connection loss
  - Send `Heartbeat(datasetKey)` every 60 seconds while a dataset is locked by this user
- [ ] Copy `useWorkflowProgress` hook — listens for `ProgressUpdate`, `WorkflowComplete`, `WorkflowError`

### 4.4 — IndexedDB setup

- [ ] Create `apps/{app-name}/src/db.ts` using Dexie:
  ```typescript
  import Dexie, { type Table } from 'dexie';

  export interface PulledDataset {
    key: string;           // "{dataflowId}:{datasetId}"
    data: any;             // the pulled JSON
    pulledAt: string;      // ISO timestamp
  }

  export interface ValidationResult {
    key: string;
    rows: any[];
    fetchedAt: string;
  }

  class AppDatabase extends Dexie {
    pulledData!: Table<PulledDataset, string>;
    validationResults!: Table<ValidationResult, string>;

    constructor() {
      super('{app-name}-db');
      this.version(1).stores({
        pulledData: 'key',
        validationResults: 'key',
      });
    }
  }

  export const db = new AppDatabase();
  ```
- [ ] On pull complete: `db.pulledData.put({ key, data, pulledAt })`
- [ ] On app load: hydrate state from `db.pulledData.get(key)`
- [ ] On push success: `db.pulledData.delete(key)`

---

## Step 5 — Build the Pages

Every webform app follows the same page structure. Create these pages:

### 5.1 — Login page

- [ ] Username + password form
- [ ] Calls `login()` from auth context
- [ ] Redirects to main view on success

### 5.2 — Pull page

- [ ] "Pull Dataset" button → calls `POST /api/{dataflowId}/{datasetId}/pull`
- [ ] Show lock status:
  - Unlocked → show pull button
  - Locked by me → show "data loaded" state, allow re-pull
  - Locked by someone else → show lock info, offer read-only pull
- [ ] Progress bar driven by `useWorkflowProgress` (SignalR)
- [ ] On complete: store data in IndexedDB, navigate to data view
- [ ] "Pull Validation" section → calls `POST /api/{dataflowId}/{datasetId}/validate`

### 5.3 — Data view / edit page (app-specific)

This is the only page that varies significantly between webforms.

- [ ] Render tables and fields according to the data model from Step 1
- [ ] Use MUI DataGrid or custom table components for tabular data
- [ ] Field types:
  - Text fields for strings
  - Number inputs for numeric fields
  - Dropdowns for codelist fields (fetch codelists from BFF schema)
  - Date pickers for date fields
  - Multiselect for multi-value codelist fields
- [ ] Track dirty state (what changed since pull)
- [ ] Save edits to IndexedDB on change (auto-save, debounced)

### 5.4 — Push page

- [ ] "Push to RN3" button → calls `POST /api/{dataflowId}/{datasetId}/push` with edited records
- [ ] Progress via SignalR
- [ ] On success: clear IndexedDB, show confirmation, lock is released
- [ ] Optional: "Download ZIP" button for local export (client-side only, no BFF needed)

### 5.5 — Validation results page

- [ ] Display validation results from the pull-validation step
- [ ] Table with: rule, severity (ERROR/WARNING/INFO), table, field, message
- [ ] Summary counts by severity
- [ ] "Explain errors" button (if AI is enabled) → `POST /api/{dataflowId}/{datasetId}/validate/explain`

### 5.6 — Navigation

- [ ] Sidebar or top nav with: Pull, Data, Push, Validation
- [ ] Lock status indicator visible at all times (locked by me / unlocked)
- [ ] Environment indicator (sandbox / production)

---

## Step 6 — App Layout and Routing

- [ ] Set up React Router (if needed) or tab-based navigation
- [ ] Create `App.tsx`:
  ```tsx
  <AuthProvider>
    <SignalRProvider>
      <Navbar />
      <MainContent />  {/* or <RouterProvider> */}
    </SignalRProvider>
  </AuthProvider>
  ```
- [ ] Add route/tab for each page from Step 5

---

## Step 7 — Dockerfile

- [ ] Create `apps/{app-name}/Dockerfile`:
  ```dockerfile
  # Build stage
  FROM node:20-alpine AS build
  WORKDIR /app
  COPY package.json pnpm-lock.yaml ./
  RUN corepack enable && pnpm install --frozen-lockfile
  COPY . .
  ARG VITE_API_URL
  ENV VITE_API_URL=$VITE_API_URL
  RUN pnpm build

  # Serve stage
  FROM nginx:alpine
  COPY --from=build /app/dist /usr/share/nginx/html
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  EXPOSE 80
  ```
- [ ] Create `apps/{app-name}/nginx.conf`:
  ```nginx
  server {
      listen 80;
      root /usr/share/nginx/html;
      index index.html;

      location / {
          try_files $uri $uri/ /index.html;
      }
  }
  ```

---

## Step 8 — Add to Docker Compose

- [ ] Add the new service to `docker-compose.yml`:
  ```yaml
  {app-name}:
    build:
      context: ./apps/{app-name}
      args:
        VITE_API_URL: http://localhost:3000
    ports:
      - "{next-port}:80"
  ```
- [ ] Verify `docker compose up --build` starts the new app alongside existing ones

---

## Step 9 — Test End-to-End

Run through the complete workflow:

- [ ] Login
- [ ] Pull dataset → verify lock is acquired
- [ ] Open a second browser/incognito → verify dataset shows as locked
- [ ] Edit records in the data view
- [ ] Push → verify data arrives in RN3 (check via RN3 web UI or Swagger)
- [ ] Verify lock is released after push
- [ ] Pull validation results → verify display
- [ ] Close tab without pushing → verify lock auto-releases after heartbeat timeout
- [ ] Read-only pull while another user has the lock → verify data loads without lock

---

## Step 10 — CI/CD

- [ ] Add the new app to the CI pipeline (build + Docker image)
- [ ] Add to deployment manifests (Kubernetes/Swarm)
- [ ] Verify automated build produces a working container

---

## Checklist Summary

Before considering the webform complete:

- [ ] Data model documented in `dev-plan/{app-name}-data-model.md`
- [ ] App scaffolded with auth, SignalR, IndexedDB
- [ ] All pages working: login, pull, data edit, push, validation
- [ ] No `VITE_RN3_*` env vars — app only talks to BFF
- [ ] Dockerfile builds and runs
- [ ] Added to Docker Compose
- [ ] End-to-end test passes
- [ ] Locking works correctly (acquire, heartbeat, release, timeout)
- [ ] Added to CI/CD pipeline

---

## Common Patterns to Reuse

When building the app-specific data view (Step 5.3), look at existing apps for patterns:

| Pattern | Where to find it |
|---|---|
| Editable data table | `apps/pams/src/components/pams/EditableDataTable.tsx` |
| Filter/search panel | `apps/pams/src/components/pams/AdvancedFilterPanel.tsx` |
| Codelist dropdown | `apps/pams/src/components/pams/UnifiedFieldDialog.tsx` |
| Validation display | `apps/pams/src/components/validation/ValidationResultsDisplay.tsx` |
| Progress bar | `apps/pams/src/components/SmartProgressBar.tsx` |

If you find yourself copying 3+ components, consider extracting them to `packages/ui`.

---

## What NOT to Do

- **Do NOT call the RN3 API directly from the frontend.** All data flows through the BFF.
- **Do NOT store API keys, tokens, or passwords in frontend code or env vars.**
- **Do NOT use localStorage for dataset storage.** Use IndexedDB (Dexie).
- **Do NOT implement your own polling loop.** Use SignalR progress events from the BFF.
- **Do NOT skip the data model documentation step.** It saves more time than it costs.
- **Do NOT duplicate the auth/SignalR/IndexedDB setup from scratch.** Copy from an existing app and adapt.
