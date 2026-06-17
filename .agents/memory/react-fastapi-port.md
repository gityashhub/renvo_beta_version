---
name: React+FastAPI port setup in Replit
description: How to serve React+FastAPI on Replit's required webview port 5000 without conflicting with Streamlit.
---

## Rule
Build React statically (`npm run build`) and serve the `dist/` folder as static files from FastAPI. FastAPI listens on port 5000. Do NOT run Vite dev server on port 5000.

**Why:** Replit's webview infrastructure requires the app to serve on port 5000. If Vite dev server tries to bind 5000 it will find it already occupied by Replit's proxy, and `strictPort: true` causes it to error. Serving via FastAPI static file mount avoids this entirely.

**How to apply:**
- `start.sh` runs `npm run build` first, then `uvicorn backend.main:app --port 5000`
- `backend/main.py` mounts `frontend/dist/assets` as `/assets` and serves `index.html` for all non-API routes
- Streamlit App workflow is set to `autoStart: false`, port 8501, outputType console — so it doesn't compete for port 5000
- React + FastAPI workflow: `waitForPort: 5000`, `outputType: webview`
- TypeScript: use `import type { ... }` for type-only imports when `verbatimModuleSyntax` is enabled in tsconfig
- Vite config: `allowedHosts: true` (boolean), not `'all'` (string)
