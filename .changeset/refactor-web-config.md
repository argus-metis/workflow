---
"@workflow/web-shared": patch
"@workflow/cli": patch
"@workflow/web": patch
---

Refactor Web UI configuration management

**Breaking Changes (internal):**
- Components now receive `env: EnvMap` directly instead of `config: WorldConfig`
- Query params are now processed once on app start, then cleared from URL

**Features:**
- Added server-side config API (`getServerConfig`) to expose env-based settings
- Added `WorldConfigProvider` context with source tracking for each config field
- Configuration values now show their source (env, user, or default)
- Self-hosted mode: configuration panel shows read-only env vars with lock icons
- Fixed CLI spawn deprecation warning by using single shell command string

**Improvements:**
- Configuration priority is now: env vars > user config (localStorage) > defaults
- Query params are saved to localStorage on first visit, then removed from URL
- Settings panel shows which fields are locked by environment variables
- Connection status now shows config source (env vs user)
- Better UX for self-hosted deployments with clear indication of locked fields

