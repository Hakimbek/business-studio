# Business Studio

A web-based strategic management system built on the Balanced Scorecard (BSC) methodology. Manage company strategy, goals, KPIs, business processes, org structure, risks, projects, and RACI responsibilities in one place.

The UI is in **Russian**.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Running on a Local Network](#running-on-a-local-network)
- [Project Structure](#project-structure)
- [Modules](#modules)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Development Workflow](#development-workflow)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui |
| Data fetching | TanStack Query v5 |
| ORM | Prisma 7 + `@prisma/adapter-libsql` |
| Database | SQLite via LibSQL (file `prisma/dev.db`) |
| Charts | Recharts v3 |
| Icons | Lucide React |

---

## Prerequisites

- **Node.js 18+** — that's it.

No database server required. The app uses a local SQLite file created automatically on first run.

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Push the schema to the database (creates prisma/dev.db automatically)
npx prisma db push

# 3. Generate the Prisma client
npx prisma generate

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be prompted to create or select a company before entering the app.

> No `.env` file is needed. The database path is hardcoded in `prisma.config.ts` as `file:./prisma/dev.db`.

---

## Running on a Local Network

To open the app from other PCs on the same Wi-Fi / LAN:

**Step 1 — Build for production** (avoids the slow Turbopack compilation that makes the first load appear to hang):

```bash
npm run build
```

**Step 2 — Start the server bound to all network interfaces:**

```bash
npm start -- --hostname 0.0.0.0
```

**Step 3 — Open from any other PC:**

```
http://<this-pc-ip>:3000
```

Find `<this-pc-ip>` by running `ipconfig` and looking for the IPv4 address (e.g. `192.168.1.100`).

> If the page doesn't open, Windows Firewall may be blocking port 3000. Run this once as Administrator:
> ```
> netsh advfirewall firewall add rule name="Next.js 3000" dir=in action=allow protocol=TCP localport=3000
> ```

---

## Project Structure

```
bs/
├── prisma/
│   ├── schema.prisma        # Database schema (all models)
│   └── dev.db               # SQLite database file (gitignored)
├── prisma.config.ts         # Prisma 7 config — sets the SQLite file path
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout: QueryClientProvider + CompanyProvider + Sidebar
│   │   ├── page.tsx         # Redirects / → /goals
│   │   ├── globals.css      # Tailwind base + custom animations (arrow-flow, ring-pulse)
│   │   ├── strategies/      # Strategies page
│   │   ├── goals/           # Goals page
│   │   ├── indicators/      # KPIs + period history page
│   │   ├── strategy-map/    # Free-form canvas strategy map
│   │   ├── processes/       # Process hierarchy page
│   │   ├── org/             # Org units + positions page
│   │   ├── responsible/     # Position management page
│   │   ├── projects/        # Projects page
│   │   ├── raci/            # RACI matrix page
│   │   ├── risks/           # Risks page
│   │   ├── reports/         # KPI chart page
│   │   └── api/             # REST API (Next.js Route Handlers)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx        # Left navigation
│   │   │   └── CompanySelect.tsx  # Company picker shown before login
│   │   ├── shared/
│   │   │   ├── PageHeader.tsx     # Title + description + action slot
│   │   │   ├── AddButton.tsx      # Consistent add button
│   │   │   └── ConfirmDialog.tsx  # Delete confirmation modal
│   │   └── ui/                    # shadcn/ui primitives
│   ├── contexts/
│   │   └── company.tsx      # Company context (cookie-based session)
│   ├── lib/
│   │   ├── prisma.ts        # Singleton PrismaClient with LibSQL adapter
│   │   ├── tree.ts          # Generic buildTree<T> for hierarchical data
│   │   └── utils.ts         # cn(), MONTHS_RU, periodLabel()
│   └── types/
│       └── index.ts         # TypeScript interfaces matching Prisma models
└── components.json          # shadcn/ui config
```

---

## Modules

### Strategies (`/strategies`)
Manage the company's strategic profile and strategic directions.

- **Company card** — edit name, mission, vision, values, and strategic horizon
- **Strategy cards** — color-coded strategic directions; each shows linked goals

### Goals (`/goals`)
Build and manage the strategic goal tree.

- Filter goals by strategy (pill bar at top)
- Each goal has: name, description, weight %, strategy, and responsible person (Position)
- Full CRUD with confirmation on delete

### Indicators / KPIs (`/indicators`)
Define and track KPIs.

- Fields: name, unit, target value, deadline, responsible person
- **Period history** — expand any indicator to add monthly fact values (last 12 months); table shows fact / target / % for each period with color coding
- Goal-indicator connections are managed from the Strategy Map, not here

### Strategy Map (`/strategy-map`)
Free-form canvas for visualizing strategic goals and indicators.

- **Multiple boards** — create as many maps as needed (tab bar)
- **Perspective regions** — draggable colored boxes with resizable borders; double-click header to rename
- **Goal cards** — circular cards (140 px diameter, like Business Studio); drag from the left panel onto the canvas; freely repositioned
- **Indicator cards** — rectangular cards; drag from the left panel onto the canvas; show target value and mini progress bar
- **RAG color coding** — cards are colored based on performance (latest period value ÷ target):
  - 🟢 Green: ≥ 80%
  - 🟡 Yellow: ≥ 50%
  - 🔴 Red: < 50%
  - Goal card inherits the worst status of its linked indicators
- **Connections** — hover a card to reveal a port circle on the right edge; click it to start a connection; click a target card or its port to complete it
  - Goal → Goal: directional link (indigo arrow)
  - Indicator → Goal: many-to-many link (cyan arrow); one indicator can link to multiple goals
  - Hover any arrow to reveal a delete button
- **Two modes** — toggled via segmented control in the toolbar (top-right of each board):
  - **Edit mode** (default) — left panel shows all unplaced goals and indicators; drag to canvas; move cards; create/delete connections and regions
  - **View mode** — left panel hidden; canvas is read-only; clean presentation view with only placed cards and connections visible
- All positions and connections are persisted to the database automatically

### Processes (`/processes`)
Manage the business process hierarchy.

- Tree structure with collapsible nodes
- Each process has: code, name, notation (BPMN / IDEF0 / EPC / Procedure), owner (Position), parent process

### Org Structure (`/org`)
Two-tab view: org units tree and positions list.

- **Units** — tree of Company → Division → Department → Group
- **Positions** — flat list with org unit; positions are referenced throughout the app (goal owner, process owner, RACI, projects)

### Responsible (`/responsible`)
Standalone page to manage Positions (job roles / responsible persons).

- Create, edit, delete positions
- Each position has a name, description, and optional org unit
- Shows avatar initial and org unit label in the list

### Projects (`/projects`)
Project register for the company.

- Fields: name, description, status, deadline, responsible person
- **Statuses**: Active / On Hold / Completed / Cancelled
- Projects are grouped by status in the list
- Overdue active projects highlight the deadline in red

### RACI Matrix (`/raci`)
Responsibility assignment matrix across processes and positions.

- Rows = all processes, Columns = all positions
- Cell toggles: **R** Responsible / **A** Accountable / **C** Consulted / **I** Informed
- Changes persist on click (no save button)

### Risks (`/risks`)
Operational risk register with two views.

- **List view** — name, probability (1–5), impact (1–5), score, level badge, linked process
- **Matrix view** — 5×5 heat map; hover a cell to see risk names
- Risk level: Low (1–4) / Medium (5–9) / High (10–16) / Critical (17–25)

### Reports (`/reports`)
KPI trend visualization.

- Select an indicator from the dropdown
- Summary cards: target value, last actual, completion %, period average
- Line chart with target reference line (Recharts)
- History table sorted newest first

---

## API Reference

All routes are under `/api`. Request and response bodies are JSON. Company context is read from the `company-id` cookie (set when a company is selected on the Company Select screen).

### Companies
| Method | Path | Description |
|---|---|---|
| GET | `/api/companies` | List all companies |
| POST | `/api/companies` | Create a company (`name`) |

### Strategies
| Method | Path | Description |
|---|---|---|
| GET | `/api/strategies` | List all strategies with linked goals |
| POST | `/api/strategies` | Create (`name`, `description?`, `color?`) |
| PUT | `/api/strategies/:id` | Update |
| DELETE | `/api/strategies/:id` | Delete |

### Goals
| Method | Path | Description |
|---|---|---|
| GET | `/api/goals` | List all goals with owner and indicators |
| POST | `/api/goals` | Create (`name`, `description?`, `weight?`, `strategyId?`, `ownerId?`) |
| PUT | `/api/goals/:id` | Update |
| DELETE | `/api/goals/:id` | Delete |

### Indicators
| Method | Path | Description |
|---|---|---|
| GET | `/api/indicators` | List all indicators with goal, process, owner |
| POST | `/api/indicators` | Create (`name`, `unit?`, `targetValue?`, `deadline?`, `ownerId?`) |
| PUT | `/api/indicators/:id` | Full update |
| PATCH | `/api/indicators/:id` | Partial update (e.g. `goalId`) |
| DELETE | `/api/indicators/:id` | Delete |

### Indicator Values
| Method | Path | Description |
|---|---|---|
| GET | `/api/indicator-values?indicatorId=X` | List period values (sorted by period asc) |
| POST | `/api/indicator-values` | Add value (`indicatorId`, `period` as `"YYYY-MM"`, `value`, `note?`) |
| DELETE | `/api/indicator-values/:id` | Delete |

### Processes
| Method | Path | Description |
|---|---|---|
| GET | `/api/processes` | List all processes with children and ownerRole |
| POST | `/api/processes` | Create (`name`, `notation`, `code?`, `parentId?`, `ownerRoleId?`) |
| PUT | `/api/processes/:id` | Update |
| DELETE | `/api/processes/:id` | Delete |

### Org Units
| Method | Path | Description |
|---|---|---|
| GET | `/api/org-units` | List all org units with children and positions |
| POST | `/api/org-units` | Create (`name`, `type`, `parentId?`) |
| PUT | `/api/org-units/:id` | Update |
| DELETE | `/api/org-units/:id` | Delete |

### Positions
| Method | Path | Description |
|---|---|---|
| GET | `/api/positions` | List all positions with orgUnit |
| POST | `/api/positions` | Create (`name`, `description?`, `orgUnitId?`) |
| PUT | `/api/positions/:id` | Update |
| DELETE | `/api/positions/:id` | Delete |

### Projects
| Method | Path | Description |
|---|---|---|
| GET | `/api/projects` | List all projects with owner |
| POST | `/api/projects` | Create (`name`, `description?`, `status?`, `deadline?`, `ownerId?`) |
| PUT | `/api/projects/:id` | Update |
| DELETE | `/api/projects/:id` | Delete |

### RACI
| Method | Path | Description |
|---|---|---|
| GET | `/api/raci` | List all RACI items |
| POST | `/api/raci` | Assign (`processId`, `positionId`, `raciType`) |
| DELETE | `/api/raci` | Remove assignment (same body as POST) |

### Risks
| Method | Path | Description |
|---|---|---|
| GET | `/api/risks` | List all risks with process |
| POST | `/api/risks` | Create (`name`, `probability?`, `impact?`, `processId?`) |
| PUT | `/api/risks/:id` | Update |
| DELETE | `/api/risks/:id` | Delete |

### Strategy Map Boards
| Method | Path | Description |
|---|---|---|
| GET | `/api/strategy-map-boards` | List all boards with entries, links, regions, indicatorEntries, indicatorLinks |
| POST | `/api/strategy-map-boards` | Create a board (`name`) |
| PUT | `/api/strategy-map-boards/:id` | Rename a board |
| DELETE | `/api/strategy-map-boards/:id` | Delete a board |
| POST | `/api/strategy-map-boards/:id/entries` | Add or move a goal on the canvas (`goalId`, `x`, `y`) |
| PATCH | `/api/strategy-map-boards/:id/entries` | Update goal position (`goalId`, `x`, `y`) |
| DELETE | `/api/strategy-map-boards/:id/entries` | Remove a goal from the canvas (`goalId`) |
| POST | `/api/strategy-map-boards/:id/links` | Create a goal→goal link (`sourceGoalId`, `targetGoalId`) |
| DELETE | `/api/strategy-map-boards/:id/links` | Delete a link (`linkId`) |
| POST | `/api/strategy-map-boards/:id/regions` | Create a perspective region (`label`, `color`) |
| DELETE | `/api/strategy-map-boards/:id/regions` | Delete a region (`regionId`) |
| PATCH | `/api/strategy-map-boards/:id/regions/:regionId` | Update region position/size/label |
| POST | `/api/strategy-map-boards/:id/indicator-entries` | Add an indicator to the canvas (`indicatorId`, `x`, `y`) |
| DELETE | `/api/strategy-map-boards/:id/indicator-entries` | Remove an indicator from the canvas (`indicatorId`) |
| PATCH | `/api/strategy-map-boards/:id/indicator-entries/:indicatorId` | Update indicator position (`x`, `y`) |
| POST | `/api/strategy-map-boards/:id/indicator-links` | Link an indicator to a goal (`indicatorId`, `goalId`) |
| DELETE | `/api/strategy-map-boards/:id/indicator-links` | Unlink an indicator from a goal (`indicatorId`, `goalId`) |

---

## Database Schema

```
Company               — one per app session; stores name

Strategy              — strategic directions (color-coded)

Goal                  — flat list; linked to Strategy, owner Position
  └── indicators: Indicator[]

Indicator             — KPI; linked to Goal and/or Process; has owner Position
  └── values: IndicatorValue[]   — monthly fact values ("YYYY-MM")

IndicatorValue        — unique(indicatorId, period)

Process               — hierarchical self-relation; has ownerRole Position
  ├── indicators: Indicator[]
  ├── risks: Risk[]
  └── raciItems: RaciItem[]

OrgUnit               — hierarchical self-relation; types: COMPANY/DIVISION/DEPARTMENT/GROUP
  └── positions: Position[]

Position              — job role / responsible person
  ├── goalsOwned: Goal[]
  ├── processesOwned: Process[]
  ├── indicatorsOwned: Indicator[]
  ├── projectsOwned: Project[]
  └── raciItems: RaciItem[]

Project               — name, description, status, deadline, owner Position

RaciItem              — unique(processId, positionId, raciType)

Risk                  — probability 1–5, impact 1–5; optional Process link

StrategyMapBoard      — one canvas per board
  ├── entries: StrategyMapEntry[]            — goal cards (x, y)
  ├── links: StrategyMapLink[]               — goal→goal directed edges
  ├── regions: StrategyMapRegion[]           — perspective boxes (x, y, w, h, color)
  ├── indicatorEntries: StrategyMapIndicatorEntry[]   — indicator cards (x, y)
  └── indicatorLinks: StrategyMapIndicatorLink[]      — indicator→goal edges (many-to-many)
```

**Enums:**

| Enum | Values |
|---|---|
| `Notation` | `IDEF0`, `BPMN`, `EPC`, `PROCEDURE` |
| `RaciType` | `RESPONSIBLE`, `ACCOUNTABLE`, `CONSULTED`, `INFORMED` |
| `OrgUnitType` | `COMPANY`, `DIVISION`, `DEPARTMENT`, `GROUP` |
| `ProjectStatus` | `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED` |

---

## Development Workflow

```bash
# Start dev server (localhost only, Turbopack)
npm run dev

# Type check without building
npx tsc --noEmit

# After editing prisma/schema.prisma:
npx prisma db push --accept-data-loss
npx prisma generate

# Build for production
npm run build

# Start production server (localhost only)
npm start

# Start production server (accessible on local network)
npm start -- --hostname 0.0.0.0

# Open Prisma Studio — visual data browser
npx prisma studio
```

### Key conventions

- **Prisma 7 + LibSQL**: `prisma.config.ts` holds the DB URL. `src/lib/prisma.ts` instantiates `PrismaClient` with `PrismaLibSql` adapter. The `datasource` block in `schema.prisma` has no `url` field (Prisma 7 pattern).
- **Schema changes**: use `npx prisma db push --accept-data-loss` (not `migrate dev`) followed by `npx prisma generate` to keep the client in sync.
- **API routes**: Next.js 16 Route Handlers with `params: Promise<{id}>` — always `await params` before accessing fields.
- **Company session**: stored in browser cookies (`company-id`, `company-name`). All API routes read `company-id` from the request cookie to scope queries.
- **Tree data**: fetched flat, assembled client-side with `buildTree<T>` from `src/lib/tree.ts`.
- **Period format**: KPI values use `"YYYY-MM"` (e.g. `"2026-06"`), displayed as `"Июнь 2026"` via `periodLabel()`.
- **Canvas drag**: the Strategy Map uses a `useRef`-based drag system (no `setState` during `mousemove`) for smooth 60fps dragging without React re-renders.
- **Cursor on Windows**: `cursor-move` is used instead of `cursor-grab` — the grab cursor renders white/invisible on Windows against white card backgrounds.
