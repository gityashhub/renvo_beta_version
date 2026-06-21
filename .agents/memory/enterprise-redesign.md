---
name: Enterprise Redesign
description: Design system decisions and architecture for the React frontend enterprise redesign
---

# Enterprise Frontend Redesign

## Design System
- **Theme**: Enterprise — white panels, slate-50 page bg, blue-600 primary (#2563EB), Inter font
- **Components**: Custom barrel file at `frontend/src/components/ui.tsx` — exports Button, Card, Alert, MetricCard, Tabs, Input, SelectInput, ProgressBar, SectionHeader, Divider, Badge
- **Pages import**: `'../components/ui'` (barrel), NOT `@/components/ui/*` (shadcn dir)
- **Tailwind**: v4 + @tailwindcss/vite plugin in `frontend/vite.config.ts`; `@import "tailwindcss"` in index.css

## Key Decisions
- Copied shadcn/ui components from mockup sandbox initially, but they had unresolved deps → deleted the entire `frontend/src/components/ui/` directory
- Pages only use the barrel `ui.tsx` + Tailwind classes directly
- `lib/utils.ts` (cn helper) at `frontend/src/lib/utils.ts`
- Path alias `@/*` → `./src/*` in tsconfig with `"ignoreDeprecations": "6.0"` (TypeScript 6 deprecated baseUrl)
- Inter font loaded via Google Fonts in `index.html`

**Why:** Keeping shadcn dir would require installing 30+ radix-ui packages; barrel approach is simpler and all pages already use it.

## 404 errors in console
Pages hit API on mount to load dataset stats — returns 404 when no dataset is loaded (expected, not a bug).

## 5 New Full-Stack Features (completed)
All 5 placeholder pages replaced with real implementations:
- Hypothesis Testing — 15 tests, recommendations, categorized tabs, Plotly results
- Data Balancer — 14 methods (Oversampling/Undersampling/Hybrid), step-by-step, train/test split
- Visualization — 4 chart panels (Missing Patterns, Column Overview, Correlation, Distribution) + Custom Builder
- Reports — 4 report types (Executive, Audit, Methodology, JSON), download buttons
- AI Assistant — Groq chat interface, suggested questions, column context selector

### New backend routers (all registered in backend/main.py)
- backend/routers/hypothesis.py — POST /api/hypothesis/recommend, POST /api/hypothesis/run
- backend/routers/balancer.py — GET methods, POST validate/balance/distribution, GET download
- backend/routers/viz.py — POST /api/viz/missing-patterns|column-overview|correlation|distribution|custom
- backend/routers/reports.py — GET /api/reports/generate, download-pdf, download-json
- backend/routers/ai.py — POST /api/ai/chat, GET history, POST clear

### New frontend API clients
frontend/src/api/hypothesis.ts, balancer.ts, visualization.ts, reports.ts, ai.ts

**Why:** These modules existed in Python (modules/) and Streamlit pages but had no FastAPI routes. Created REST wrappers following existing router patterns.
