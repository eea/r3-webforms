# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **RN3 Webform Platform** — a monorepo (in progress) for React webform applications that interact with the Reportnet3 (RN3) API. The platform consolidates two webform projects (PAMS and Fgases) behind a shared ASP.NET Core BFF with SignalR real-time communication.

The full roadmap is in `dev-plan/workplan.md`. Architecture details are in `dev-plan/architecture.md`. The guide for adding new webforms is in `dev-plan/new-webform-guide.md`.

## Current Repository State

The monorepo structure (`apps/`, `packages/`, root `pnpm-workspace.yaml`) does not exist yet — Phase 1 of the workplan has not been started. The repo currently contains:

- **`govreg-annexi-webforms/`** — The existing PAMS application (React 19 + Vite + MUI + TypeScript). This is the source that will be moved to `apps/pams` in Phase 1.
- **`Fgases/`** — Legacy AngularJS 1.3 Fgases webform (multiple versions v2–v10, Bower-based). Reference only — will be rewritten as a React app in Phase 4.
- **`dev-plan/`** — Architecture docs and workplan.

Both `Fgases/` and `govreg-annexi-webforms/` are gitignored (they are legacy reference copies).

## PAMS Frontend (govreg-annexi-webforms/FRONT/)

### Commands

```bash
cd govreg-annexi-webforms/FRONT
npm install          # install dependencies
npm run dev          # dev server on localhost:5173
npm run build        # tsc -b && vite build → dist/
npm run lint         # eslint
npm run preview      # preview production build
```

### Tech Stack

React 19, TypeScript 5.9, Vite 7, MUI 7 (including x-data-grid, x-date-pickers, x-tree-view), Highcharts, JSZip, Axios, dnd-kit.

### Architecture

- **`src/services/rn3Api.ts`** — All direct RN3 API calls (will be replaced by BFF client in Phase 3)
- **`src/contexts/AuthContext.tsx`** — Authentication state (currently stores RN3 credentials client-side)
- **`src/types/rn3.ts`** — RN3 API type definitions
- **`src/schema/`** — `tableSchema.ts` (RN3 table/field definitions), `pamViewConfig.ts` (UI layout config)
- **`src/components/pams/`** — PAMS-specific data editing components (EditableDataTable, AdvancedFilterPanel, UnifiedFieldDialog, etc.)
- **`src/components/validation/`** — Validation results display and data fetching
- **`src/components/treeview/`** — Tree-structured data view with sortable tables
- **Top-level pages**: `PullPage.tsx`, `PushPage.tsx`, `DataOpsPage.tsx`, `PamsDetailsPage.tsx`, `StatisticsPage.tsx`, `ValidationWorkflow.tsx`
- **`vite.config.ts`** — Proxies `/api` → RN3 sandbox, `/api-prod` → RN3 production, `/api-preprod` → RN3 pre-production

### Key Patterns

- The app currently talks directly to RN3 API through the Vite proxy (no BFF yet)
- Data is pulled as ZIP from RN3, extracted client-side with JSZip
- Browser-side polling for long-running RN3 jobs (export, import, validation)
- `SmartProgressBar.tsx` estimates progress during polling

## Target Architecture (dev-plan/)

The planned architecture introduces:
- **`apps/api/`** — ASP.NET Core BFF (.NET 9) handling all RN3 communication, auth, locking, SignalR
- **`apps/pams/`** — Migrated PAMS (no direct RN3 calls, uses BFF + IndexedDB via Dexie)
- **`apps/fgases/`** — New React app for Fgases
- **`packages/ui/`** — Optional shared component library (Phase 4+)
- pnpm workspaces for frontend apps, dotnet CLI for the API

## RN3 API

Reportnet3 is the EU environmental reporting platform. Key endpoints used:
- `/user/generateToken` — auth token generation
- `/dataset/v3/etlExport/{datasetId}` — trigger data export (returns job URL to poll)
- `/dataset/v1/importFileData/{datasetId}` — import data as ZIP of CSVs
- `/validation/v1/runValidation/{datasetId}` — trigger validation
- `/dataschema/v1/getSimpleSchema/{datasetId}` — get dataset schema

All RN3 operations are long-running: trigger → poll job status → download result.
