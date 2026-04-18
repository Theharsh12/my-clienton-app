# Copilot Workspace Instructions

## Overview
This project is a Vite + React 19 SPA using shadcn/ui, Tailwind CSS, TanStack React Query, and Supabase for authentication and data. It is structured for rapid prototyping and modern frontend best practices.

## Build & Test Commands
- **Dev**: `bun run dev` (Vite, port 8080)
- **Build**: `bun run build` or `bun run build:dev`
- **Test**: `bun run test` or `bun run test:watch`
- **Lint**: `bun run lint` (minimal rules)

## Key Conventions
- `src/pages/`: Route-level pages (auth-aware, full logic)
- `src/components/`: Reusable UI, organized by domain (e.g., `clients/`)
- `src/lib/`: Business logic (progress calc, CSV export, analytics)
- `src/hooks/`: Context + custom hooks
- `src/types/`: Shared interfaces (see `ClientRow`)
- **Dialogs**: Use Framer Motion for animation, toast for notifications
- **React Query**: For all server state

## Environment Variables
- **Required**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Optional**: `VITE_GA_MEASUREMENT_ID`

## Pitfalls & Gotchas
- Session is stored in localStorage (PWA cache may cause issues)
- Only `/auth` and `/` auto-redirect on login/logout
- Relative times are client-side and may drift
- TypeScript is permissive (unused vars/args allowed)
- Vercel redirect fallback is hardcoded (update if domain changes)

## Key Files
- `src/pages/Clients.tsx`: Full CRUD, filtering, sorting, plan management
- `src/components/CreateClientDialog.tsx`: Dialog pattern, copy/share
- `src/lib/clientUtils.ts`: Pure functions for progress/state logic

## Links
- [README.md](README.md) for getting started and deployment
- [Supabase client](src/integrations/supabase/client.ts) for env validation

---

### Example Prompts
- "Add a new onboarding step to client progress logic."
- "Refactor dialog to use context for open state."
- "Add a new toast notification for failed login."
- "Export filtered clients as CSV."

---

## Next Steps
Consider creating agent customizations for:
- **Frontend-only instructions** (applyTo: `src/pages/**`, `src/components/**`)
- **Test helpers** (applyTo: `src/test/**`)
- **Supabase integration** (applyTo: `src/integrations/supabase/**`)

Use `/create-instruction`, `/create-agent`, or `/create-skill` to further specialize Copilot for this workspace.