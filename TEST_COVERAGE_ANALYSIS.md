# Test Coverage Analysis

## Executive Summary

The codebase has **56 test files** covering **~246 source files** across 29 packages. Overall unit test file coverage is approximately **23%** (56 test files / 246 non-trivial source files). Many critical packages have **zero** test coverage, and several core runtime paths are only exercised indirectly through E2E tests.

---

## Coverage By Package

| Package | Source Files | Test Files | File Coverage | Severity |
|---------|-------------|-----------|---------------|----------|
| `@workflow/core` | 45 | 16 | 36% | Medium |
| `@workflow/cli` | 27 | 0 | 0% | **Critical** |
| `@workflow/next` | 5 | 0 | 0% | **Critical** |
| `@workflow/world` | 10 | 0 | 0% | **Critical** |
| `@workflow/world-local` | 17 | 5 | 29% | High |
| `@workflow/world-vercel` | 11 | 2 | 18% | High |
| `@workflow/world-postgres` | 13 | 3 | 23% | High |
| `@workflow/builders` | 17 | 3 | 18% | High |
| `@workflow/ai` | 13 | 4 | 31% | Medium |
| `@workflow/workflow` | 18 | 1 | 6% | **Critical** |
| `@workflow/web` | 56 | 0 | 0% | Medium |
| `@workflow/web-shared` | 48 | 0 | 0% | Medium |
| `@workflow/errors` | 1 | 0 | 0% | High |
| `@workflow/serde` | 1 | 0 | 0% | High |
| `@workflow/typescript-plugin` | 7 | 5 | 71% | Low |
| `@workflow/utils` | 7 | 6 | 86% | Low |

---

## Proposed Improvement Areas

### 1. Core Runtime Handlers (HIGH PRIORITY)

**Files:** `packages/core/src/runtime/step-handler.ts` (514 lines), `suspension-handler.ts` (267 lines), `helpers.ts` (372 lines)

These files contain the most critical business logic in the codebase -- step execution orchestration, retry logic, suspension handling, and health checks -- yet have **zero** direct unit tests. They are partially exercised by E2E tests, but that provides no isolation for debugging regressions.

**Recommended tests:**
- `step-handler.ts`: Step execution lifecycle, retry backoff with `maxRetries`/`retryAfter`, `FatalError` vs. `RetryableError` handling, health check integration, queue message creation, telemetry span creation
- `suspension-handler.ts`: Workflow suspension event creation, hook/step/wait creation coordination, parallel operation handling, hook conflict detection
- `helpers.ts`: Health check implementation, queue overhead calculations, stream utilities, message parsing edge cases

### 2. CLI Commands (HIGH PRIORITY)

**Package:** `packages/cli/` -- 27 source files, 0 tests

The CLI is the primary user-facing interface for standalone mode. Every command (`build`, `dev`, `start`, `cancel`, `inspect`, `init`, `validate`, `health`, `web`) is untested.

**Recommended tests:**
- Configuration resolution and validation (`lib/config/workflow-config.ts`)
- Each command's core logic (mock the I/O layer)
- Vercel API integration error handling (`lib/inspect/vercel-api.ts`)
- Update check logic (`lib/update-check.ts`)
- Pagination and output formatting (`lib/inspect/pagination.ts`, `lib/inspect/output.ts`)

### 3. World Interface Compliance (HIGH PRIORITY)

**Package:** `packages/world/` -- 10 source files, 0 tests

This package defines the foundational `World`, `Storage`, `Streamer`, and `Queue` interfaces that all backends implement. There is no shared compliance test suite that validates each backend against the interface contract.

**Recommended tests:**
- Create a shared "world spec" test suite that can run against any `World` implementation
- Validate event ordering guarantees, pagination behavior, hook state transitions
- Test serialization round-trips through the interface boundary
- `packages/world-testing` partially does this but only tests the `local` backend

### 4. World Backend Storage Layers (HIGH PRIORITY)

**Files across `world-local`, `world-vercel`, `world-postgres`:**

Each backend has granular storage sub-modules (events, hooks, runs, steps) that are largely untested:

- **world-local**: `storage/events-storage.ts`, `storage/hooks-storage.ts`, `storage/runs-storage.ts`, `storage/steps-storage.ts`, `storage/filters.ts`, `storage/legacy.ts`, `queue.ts` -- all untested
- **world-vercel**: `events.ts`, `hooks.ts`, `runs.ts`, `steps.ts`, `storage.ts` -- all untested
- **world-postgres**: `boss.ts` (pg-boss integration), `queue.ts`, `storage.ts`, `streamer.ts`, `drizzle/cbor.ts` -- all untested

**Recommended tests:**
- Unit tests for each storage sub-module with filesystem/mock backends
- CBOR encoding/decoding edge cases (world-postgres)
- Queue processing and trigger handling
- Legacy data migration paths (world-local)

### 5. Hook Resumption and Lifecycle (HIGH PRIORITY)

**File:** `packages/core/src/runtime/resume-hook.ts` (247 lines) -- 0 tests

Hook resumption is a key user-facing feature (webhooks, human-in-the-loop). The resume path, webhook handling, payload dehydration, and hook metadata retrieval are untested.

**Recommended tests:**
- Happy path: resume hook with valid payload
- Invalid/expired hook tokens
- Webhook signature validation
- Concurrent hook resumption race conditions
- Hook token reuse after workflow completion

### 6. Error Package (HIGH PRIORITY)

**Package:** `packages/errors/` -- 1 source file, 0 tests

Defines the entire error hierarchy (`WorkflowError`, `WorkflowAPIError`, `FatalError`, `RetryableError`, etc.). Error instantiation, `.is()` type guards, serialization/deserialization, and cause chain handling are all untested.

**Recommended tests:**
- Each error class: instantiation, message formatting, `.is()` guard
- Error serialization round-trips
- Stack trace preservation through cause chains
- `RetryableError` retry timing fields

### 7. Builders Package (MEDIUM PRIORITY)

**Package:** `packages/builders/` -- 17 source files, 3 tests (18% coverage)

The base builder (`base-builder.ts`), standalone builder (`standalone.ts`), SWC integration (`swc-esbuild-plugin.ts`, `apply-swc-transform.ts`), entry point discovery (`discover-entries-esbuild-plugin.ts`), and Vercel build output (`vercel-build-output-api.ts`) are all untested.

**Recommended tests:**
- Base builder lifecycle (build, watch, rebuild)
- Entry point discovery and filtering
- SWC transformation error handling
- Build artifact generation
- Vercel Build Output API compliance

### 8. Next.js Integration (MEDIUM PRIORITY)

**Package:** `packages/next/` -- 5 source files, 0 tests

The Next.js integration includes a complex webpack loader, builder with file watching, manifest generation, and SWC cache. These are implicitly tested through E2E tests but have no unit coverage.

**Recommended tests:**
- Webpack loader transformation behavior
- File watching (add, modify, delete)
- Path normalization (Windows/Unix)
- Manifest generation and merging
- Incremental rebuild correctness

### 9. AI Provider Integrations (MEDIUM PRIORITY)

**Package:** `packages/ai/` -- 13 source files, 4 tests (31% coverage)

The agent core is tested, but all five provider integrations (`anthropic.ts`, `openai.ts`, `google.ts`, `gateway.ts`, `xai.ts`) and tool conversion (`tools-to-model-tools.ts`) are untested.

**Recommended tests:**
- Each provider: initialization, configuration, API error handling
- Tool conversion and validation
- Stream handling edge cases across providers

### 10. Workflow SDK Framework Integrations (MEDIUM PRIORITY)

**Package:** `packages/workflow/` -- 18 source files, 1 test (6% coverage)

Only `stdlib.ts` is tested. The framework integration entry points (`astro.ts`, `nest.ts`, `nitro.ts`, `nuxt.ts`, `sveltekit.ts`, `vite.ts`) and internal modules (`serialization.ts`, `errors.ts`, `observability.ts`) are all untested.

**Recommended tests:**
- Internal serialization/deserialization round-trips
- Framework integration exports and configuration
- API contract validation

### 11. Observability & Telemetry (MEDIUM PRIORITY)

**Files:** `packages/core/src/telemetry.ts`, `telemetry/semantic-conventions.ts`, `logger.ts`, `source-map.ts`

All observability code has zero test coverage. Trace context propagation, semantic convention generation, logger behavior, and source map error remapping are untested.

**Recommended tests:**
- Trace context serialization/deserialization round-trips
- Semantic convention attribute generation
- Logger level filtering and output
- Source map stack trace remapping with various error formats

### 12. E2E Test Gaps (MEDIUM PRIORITY)

The existing E2E suite (44+ test cases in `e2e.test.ts`) is solid but missing several scenarios:

**Recommended additions:**
- **Workflow cancellation** -- no tests for stopping running workflows
- **Concurrent workflow execution** -- no tests for multiple simultaneous workflows
- **Large payloads** -- no stress tests for multi-MB inputs/outputs
- **Timeout behavior** -- no tests for step/workflow timeout handling
- **Network failure recovery** -- no tests for retrying after transient failures
- **Cross-backend E2E** -- currently only tests one backend at a time; no comparison tests

### 13. Web UI (LOW PRIORITY)

**Packages:** `packages/web/` (56 files) and `packages/web-shared/` (48 files) -- 0 tests

The entire web UI has no tests. While UI tests provide less bang-for-buck than runtime tests, the trace viewer, event analysis, and API client logic in `web-shared` contain non-trivial logic worth testing.

**Recommended tests:**
- Component tests for trace viewer logic (`trace-span-construction.ts`, `trace-time-utils.ts`)
- API client error handling (`workflow-api-client.ts`)
- Event analysis utilities (`event-analysis.ts`)
- React component rendering (via React Testing Library)

---

## Recommended Prioritization

| Phase | Focus | Effort | Impact |
|-------|-------|--------|--------|
| **Phase 1** | Core runtime handlers, error package, hook resumption | Medium | Very High |
| **Phase 2** | World interface compliance suite, storage sub-modules | Medium | High |
| **Phase 3** | CLI commands, builders | High | High |
| **Phase 4** | Next.js integration, AI providers, workflow SDK | Medium | Medium |
| **Phase 5** | Observability, E2E gaps, web UI | High | Medium |
