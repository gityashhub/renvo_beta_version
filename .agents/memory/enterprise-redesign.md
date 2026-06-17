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
