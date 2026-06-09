# Graph Report - black-and-brew  (2026-06-09)

## Corpus Check
- 204 files · ~122,301 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1276 nodes · 1716 edges · 107 communities (79 shown, 28 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `15d2e63a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 115|Community 115]]

## God Nodes (most connected - your core abstractions)
1. `Decision Log` - 52 edges
2. `assertWritableSession()` - 27 edges
3. `cn()` - 25 edges
4. `Changelog` - 25 edges
5. `Memory Log — BLACKANDBREW ERP` - 24 edges
6. `Recent Decisions` - 22 edges
7. `PROTOCOL ENFORCER` - 21 edges
8. `SYNERGY BUNDLES (ชุดทักษะมัดรวมสำหรับ AI)` - 18 edges
9. `POST()` - 16 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Black and Brew Coffee Logo` --references--> `Vision & Mission`  [INFERRED]
  public/images/logo.png → docs/prd.md
- `AI Orchestrator Set` --conceptually_related_to--> `/api/chat route`  [INFERRED]
  docs/skills.md → src/app/api/chat/route.ts
- `Data Synchronization Standard` --references--> `Postgres RPC: set_inventory_stock`  [INFERRED]
  AGENTS.md → sql/sync_inventory_stock.sql
- `DEC-068: Deterministic AI Daily Schedule Response` --implements--> `/api/chat route`  [EXTRACTED]
  docs/memory.md → src/app/api/chat/route.ts
- `DEC-066: SECURE-REFACTOR-PROTOCOL` --references--> `Security Library`  [EXTRACTED]
  docs/memory.md → src/lib/security/sanitize.ts

## Import Cycles
- None detected.

## Communities (107 total, 28 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.16
Nodes (18): COLUMN_ALIASES, fetchInventorySummary(), fetchShiftsByDate(), fetchTablePreset(), GatewayError, getAdminClient(), getRealColumnName(), StoreStatus (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (46): assertWritableSession(), clearAuth(), getCookieOpts(), isReadOnlySession(), verifyPin(), deleteInventoryItem(), deleteInventoryItemsBulk(), fetchFrequentItems() (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (13): LiveStatusTrackerProps, CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (16): EXECUTIVE_RULES, ExecutiveRules, buildSmartMemory(), buildSystemPrompt(), chatRateLimiter, classifyIntent(), IntentScores, JUNK_FIELDS (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (28): ACTIVE_TIME_VALUES, compileDailyReportPayload(), fetchNextHoliday(), fetchTodayShifts(), fetchWeatherForecast(), formatStaffSection(), getSupabaseAdmin(), isActiveShift() (+20 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (13): EmployeeStatus, getEmployeeStatus(), LiveStatusTrackerProps, Profile, Shift, sortProfiles(), StatusGrid(), StatusGridProps (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (30): dependencies, ai, @ai-sdk/google, @ai-sdk/react, class-variance-authority, clsx, date-fns, date-fns-tz (+22 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (41): fetchComprehensiveInventoryData(), fetchLocalTrends(), fetchSupabaseContext(), fetchWeather(), getMarketInsights(), getSupabaseAdmin(), buildAnalyticalSignals(), buildInventoryContext() (+33 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (28): Common, error, loading, Dashboard, inventory, inventoryTitle, maintenance, maintenanceTitle (+20 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (26): Common, error, loading, Dashboard, inventory, inventoryTitle, maintenance, maintenanceTitle (+18 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (17): eslintConfig, devDependencies, eslint, eslint-config-next, jsdom, markdownlint-cli2, tailwindcss, @tailwindcss/postcss (+9 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (8): fetchRosterData(), Profile, Shift, MaintenanceFormData, MaintenanceModalsProps, ClickableDatePicker(), ClickableDatePickerProps, PopoverCoords

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (4): AIChatOverlay, metadata, viewport, I18nProviderProps

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (35): checkAuth(), dateRangeSchema, ensureAuthorized(), saveRegularHolidays(), supabaseAdmin, syncHolidays(), formatToThai(), isSameThaiDay() (+27 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (41): SidebarToggleStore, useSidebarToggle, useStore(), PurchaseOrderItem, PurchaseOrdersModal(), PurchaseOrdersModalProps, getMenuList(), MenuGroup (+33 more)

### Community 16 - "Community 16"
Cohesion: 0.21
Nodes (12): computedHash, skillPath, source, sourceType, computedHash, skillPath, source, sourceType (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.21
Nodes (8): DailyShiftEntry, FormattedDailyShifts, normalizeShiftLocation(), ProfileRow, ShiftCategory, ShiftRow, formatScheduleChatResponse(), profiles

### Community 19 - "Community 19"
Cohesion: 0.27
Nodes (10): detectThaiWeekday(), isDailyScheduleQuery(), resolveScheduleTargetDate(), resolveWeekdayTargetDate(), THAI_WEEKDAY_PATTERNS, detectThaiMonth(), inferYear(), parseExplicitScheduleDate() (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.40
Nodes (5): Data Synchronization Standard, Inventory Server Actions, Inventory Data Flow (Google Sheets Logic), Transaction Integrity Protocol, Postgres RPC: set_inventory_stock

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (20): /api/chat route, Agent Platform in Express Mode, API spec & Documentation (source of truth), Application Default Credentials (ADC), Authentication & Configuration, C#/.NET, Core Directives, Gemini API in Agent Platform (+12 more)

### Community 22 - "Community 22"
Cohesion: 0.22
Nodes (11): colorMap, CommandCenterGrid(), iconMap, NavItem, SortableItem, LiveShiftList(), DynamicInventoryManager(), useSafeDndSensors() (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (7): plugins, supabase, tavily, vercel, enabled, enabled, enabled

### Community 24 - "Community 24"
Cohesion: 0.50
Nodes (3): {Link, redirect, usePathname, useRouter, getPathname}, routing, config

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (7): ChatBubble(), QUICK_ACTIONS, PROMPT_INJECTION_PATTERNS, sanitizePromptInput(), sanitizeScreenContext(), sanitizeXssPayload(), XSS_PATTERNS

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (3): Security Library, DEC-066: SECURE-REFACTOR-PROTOCOL, Auth, Sales & Security

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (11): Black-and-Brew ERP System Overview, Active Modules, API, Pages, PROJECT_MAP — BLACK-AND-BREW ERP, Project Structure, Routes, Server Actions (`src/app/actions/`) (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.31
Nodes (6): LiveShiftListProps, PerformanceData, SortableEmployeeCardProps, ShiftCardProps, Profile, Shift

### Community 57 - "Community 57"
Cohesion: 0.04
Nodes (52): DEC-001: Column Rename `product_id` → `inventory_item_id`, DEC-002: Two-Step Fetch Strategy for Transaction History, DEC-003: Service Role Key for Server Actions, DEC-003: Sub-label Typography Standard, DEC-004: Atomic Transactions via PostgreSQL RPC, DEC-005: Computed Order Quantity (Read-Only Field), DEC-006: No Bold Text (R0 Visual Standard), DEC-007: Undo/Redo Bypasses Financial Transactions (+44 more)

### Community 58 - "Community 58"
Cohesion: 0.50
Nodes (3): Deprecated (removed from codebase), MASTER BLUEPRINT — BLACKANDBREW ERP, Summary

### Community 59 - "Community 59"
Cohesion: 0.07
Nodes (29): 1.10 Migration (`migrate-inventory-sort-order.ts`), 1.1 Auth (`auth.ts`), 1.2 Inventory (`inventory-actions.ts`), 1.3 Shift (`shift-actions.ts`), 1.4 Holiday (`holiday-actions.ts`), 1.5 Maintenance (`maintenance-actions.ts`), 1.6 Sales (`sales-actions.ts`), 1.7 Market Insights (`market-insights-actions.ts`) (+21 more)

### Community 60 - "Community 60"
Cohesion: 0.07
Nodes (29): 10. Motion System (v6.9), 1. Design Philosophy, 2. Color Palette, 3. Typography, 4. Layout & Spacing, 5. Component Standards, 6. Interaction Standards, 7. Z-Index Layering (+21 more)

### Community 61 - "Community 61"
Cohesion: 0.08
Nodes (25): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+17 more)

### Community 62 - "Community 62"
Cohesion: 0.16
Nodes (23): DEC-046: AI System Prompt - Store Location & Weather Context (v4.5), DEC-047: Global Mobile UI Overhaul & Responsive Isolation (v4.6), DEC-048: Local Consumer Behavior & Market Insights Service (v4.7), DEC-049: Bru AI 2.0 - Weighted Intent & Relational Reasoning (v4.8), DEC-050: Full Roster Visibility Protocol (v4.9), DEC-051: Categorized Daily Roster Reporting (v5.0), DEC-052: Enhanced Staff Roster Sorting & Headcount Protocol (v5.1), DEC-054: Plain Text Minimalist Roster Formatting (v5.3) (+15 more)

### Community 63 - "Community 63"
Cohesion: 0.08
Nodes (25): 2026-05-25, 2026-05-26, 2026-05-27, 2026-05-29, 2026-05-31, 2026-06-01 (v5.9), 2026-06-01 (v6.0 - AI Engine Vercel SDK Fix), 2026-06-01 (v6.1 - PWA & Mobile UI/UX Overhaul) (+17 more)

### Community 64 - "Community 64"
Cohesion: 0.09
Nodes (21): 1. Naming Conventions, 2. Code Style Rules, 3. Workflow Rules, 4. Build & Deploy Rules, AI Workflow (One-Shot Execution Rule), Critical Column Names (VERIFIED — DO NOT CHANGE), CSS Classes (Aesthetic Enforcer), Data Handling (+13 more)

### Community 65 - "Community 65"
Cohesion: 0.08
Nodes (24): 1. Data & Integration Capabilities, 2. UI/UX & Client Capabilities, 3. Performance & Security Capabilities, BLACKANDBREW ERP: SKILL HARVESTING & SYNERGY BUNDLING, [Bundle 10] AI Orchestrator Set 🤖, [Bundle 11] Session & Access Control Set 🔐, [Bundle 12] Inventory Truth Layer Set 📦, [Bundle 13] Thai Temporal Intelligence Set 🕐 (+16 more)

### Community 66 - "Community 66"
Cohesion: 0.09
Nodes (21): Automated Ordering Standards, Branding Standard, Database Access Standards, Employee Data Integrity (DEC-059), High-Performance Drag Standards (World-Class Velocity), Ledger Integrity, Modal Vertical Centering & Overflow (DEC-058), Motion & Animation Standard (v6.9) (+13 more)

### Community 67 - "Community 67"
Cohesion: 0.11
Nodes (18): 1. Table Overview, 2. Core Table Schemas, 3. RLS Policies, 4. Indexes, 5. RPC Functions, 6. Migration Files, Current Standard (post `fix_inventory_rls.sql`), Database Schema — BLACKANDBREW ERP (+10 more)

### Community 68 - "Community 68"
Cohesion: 0.11
Nodes (17): 1. Vision & Mission, 2. Target Users, 3.1 Command Center, 3.2 Staff Dashboard, 3.3 Schedule, 3.4 Inventory, 3.5 Maintenance, 3.6 Sales (+9 more)

### Community 69 - "Community 69"
Cohesion: 0.20
Nodes (12): deleteServiceRecord(), ensureAuthorized(), recordIdSchema, saveServiceRecord(), ServiceRecordPayload, serviceRecordSchema, supabaseAdmin, MaintenanceModals (+4 more)

### Community 70 - "Community 70"
Cohesion: 0.11
Nodes (18): 1. Overview, 2. Authentication Flow, 3. Supabase Dual-Client Strategy, 4. Route Structure, 5. Data Flow Patterns, 5b. AI Data Access Map (AI-GATEWAY-P3), 6. State Management, 7. External Integrations (+10 more)

### Community 71 - "Community 71"
Cohesion: 0.12
Nodes (15): 1. System Overview, ✅ 2.1 Excel File Processing, ✅ 2.2 Supabase Database Integration, ✅ 2.3 Data Integrity Checks, ✅ 2.4 Data Relationships, ✅ 2.5 AI Analysis Integration, ✅ 2.6 Sales History & Forecasting, ✅ 2.7 User Interface (+7 more)

### Community 72 - "Community 72"
Cohesion: 0.12
Nodes (15): 10. Progressive Web App (PWA) & Mobile-First Standards (v6.1), 1. Visual Standard: "Pastel Frictionless", 2. Interaction Engine: "Precision DnD", 3. Data Integrity: "Service Role Protocol", 4. AI Agent: "บรู" (Vercel AI SDK v6), 5. Persistent UI & Session States, 6. Schedule Grid & Summary Computations, 7. Server-Side Security Gate & Anti-Brute Force (R1 Standard) (+7 more)

### Community 73 - "Community 73"
Cohesion: 0.13
Nodes (14): AI & External APIs, Architecture, Auth & Location, Authentication, BLACK-AND-BREW ERP System, Contributing, Documentation, Environment Variables (+6 more)

### Community 74 - "Community 74"
Cohesion: 0.14
Nodes (13): 1.1 Autonomous Execution Privileges (สิทธิ์การทำงานอิสระ), 1. AI Autonomy Level, 2. Operational Protocol, 3. Agent Tools (AI Chat — `/api/chat`), 4. Combo Matrix (SOP), 5. Safety Net, 6. Error Handling Rules, 7. Daily Closing Workflow (+5 more)

### Community 75 - "Community 75"
Cohesion: 0.14
Nodes (13): Backlog 📋, Completed Tasks ✅, High Priority, Low Priority, Medium Priority, Phase 1: Environment Setup, Phase 2: Core Engine & Database, Phase 3: UI Modules (+5 more)

### Community 77 - "Community 77"
Cohesion: 0.14
Nodes (10): cache, fetchTavily(), hashQuery(), normaliseQuery(), rateLimiter, TavilyResult, SlidingWindowRateLimiter, mockFetch (+2 more)

### Community 78 - "Community 78"
Cohesion: 0.15
Nodes (12): 1. Project Identity, 2. Business Context, 3. Environment, 4. Authentication, 5. Operational Constraints, 6. Key Dependencies, 7. File Structure Overview, Context — BLACKANDBREW ERP (+4 more)

### Community 82 - "Community 82"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, lint:md, lint:md:fix, start, test

### Community 83 - "Community 83"
Cohesion: 0.22
Nodes (8): 1. Overview, 2.1 Root Documentation, 2.2 docs/ Directory, 2.3 Not Modified, 2. Files Updated (2026-06-07), 3. Prior Cycle (2026-06-04 to 2026-06-06) — v6.4–v6.9, 4. Known Documentation vs Code Notes, Summary Report: Documentation & Feature Update

### Community 84 - "Community 84"
Cohesion: 0.22
Nodes (8): Automated Tests, [Component Name] Inventory Page, Manual Verification, [MODIFY] [page.tsx](file:///c:/Users/chach/.gemini/antigravity/scratch/black-and-brew/src/app/[locale]/inventory/page.tsx), Plan: Mobile Inventory UI & Drag-and-Drop Fixes, Proposed Changes, Tech Stack & Architecture, Verification Plan

### Community 85 - "Community 85"
Cohesion: 0.42
Nodes (8): Agent Rules — BLACKANDBREW ERP, CORE DEVELOPMENT SOP (Superpowers), DATA SYNCHRONIZATION STANDARD, ERROR HANDLING & SYSTEMATIC DEBUGGING STANDARD, GLOBAL UI INTERACTION RULES, SPREADSHEET-STYLE UI MAINTENANCE (Editable Grid), This is NOT the Next.js you know, UI/UX PRO MAX STANDARDS

### Community 87 - "Community 87"
Cohesion: 0.25
Nodes (7): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 88 - "Community 88"
Cohesion: 0.29
Nodes (6): 1. Overview & Scope, 2. Constraints & Tech Stack, 3. Data Integrity & Security, 4. UI/UX Acceptance Checks, 5. Performance Strategy, FEATURE SPECIFICATION: [Feature Name]

### Community 89 - "Community 89"
Cohesion: 0.29
Nodes (6): Core principles, Google Cloud Well-Architected Framework skill for the Security pillar, Overview, Relevant Google Cloud products, Validation checklist, Workload assessment questions

### Community 90 - "Community 90"
Cohesion: 0.29
Nodes (6): Code Execution, Function Calling, Search Grounding, Structured Output and Tools, Structured Output (JSON Schema), Url Context

### Community 91 - "Community 91"
Cohesion: 0.29
Nodes (6): Basic Text Generation, Chat (Multi-turn conversations), Multimodal Inputs (Images, Audio, Video), Synchronous Streaming, Text and Multimodal Generation, YouTube Videos

### Community 92 - "Community 92"
Cohesion: 0.33
Nodes (5): 1. Writing Plans (Standard: `writing-plans`), 2. Test-Driven Development (Standard: `tdd`), 3. Systematic Debugging (Standard: `debugging`), 4. Daily Closing Integrity Workflow (Standard: `daily-closing`), BLACKANDBREW Standard Operating Procedure (SOP)

### Community 93 - "Community 93"
Cohesion: 0.33
Nodes (5): Advanced Features, Batch Prediction, Content Caching, Model Context Protocol (MCP) support (experimental), Thinking (Reasoning)

### Community 94 - "Community 94"
Cohesion: 0.33
Nodes (5): MODULE 1: MOBILE_UX_ARCHITECT, MODULE 2: HYBRID_CONTEXT_ENGINE, MODULE 3: SYSTEM_SECURITY_HARDENING, MODULE 4: PERFORMANCE_&_TOKEN_ECONOMY, SKILLS INVENTORY

### Community 95 - "Community 95"
Cohesion: 0.40
Nodes (4): Bounding Box Detection, Coordinate System, Implementation (Python), Visualization Helper

### Community 96 - "Community 96"
Cohesion: 0.40
Nodes (4): Image Editing, Image Generation, Media Generation, Video Generation

### Community 97 - "Community 97"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 98 - "Community 98"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 99 - "Community 99"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 100 - "Community 100"
Cohesion: 0.50
Nodes (3): For /graphify explain, For /graphify path, graphify reference: query, path, explain

### Community 101 - "Community 101"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **677 isolated node(s):** `PreToolUse`, `enabled`, `enabled`, `recommendations`, `version` (+672 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `assertWritableSession()` connect `Community 1` to `Community 4`, `Community 69`, `Community 14`, `Community 7`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 15` to `Community 1`, `Community 69`, `Community 22`, `Community 14`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `useReadOnly()` connect `Community 22` to `Community 1`, `Community 69`, `Community 7`, `Community 42`, `Community 14`, `Community 15`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `cn()` (e.g. with `DynamicInventoryManager()` and `EditableCell()`) actually correct?**
  _`cn()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PreToolUse`, `enabled`, `enabled` to the rest of the system?**
  _684 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.052917232021709636 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11857707509881422 - nodes in this community are weakly interconnected._