# Frontend — WNIU Automation

React 18.2 + TypeScript 5.9 SPA built with Vite. UI via Chakra UI 2.8, routing via React Router 7.9, HTTP via Axios.

## Component Conventions

- **File naming**: `PascalCase.tsx` for components, `camelCase.ts` for utilities/hooks/services.
- **Location**: Domain folders under `src/components/` (e.g. `auth/`, `workflow/`, `common/`).
- **Structure**: Functional components only — no class components.
- **Co-location**: Keep component-specific logic in the same file unless reused elsewhere.
- **Exports**: Named exports from components (not default exports).

## State Management

- **Global state**: React Context only (currently `AuthContext` for auth/user state).
- **Local state**: `useState` / `useReducer` in components.
- **Server state**: Custom hooks (e.g. `useExecutionStatus` polls every 2 s, stops on completion).
- **Persistence**: Auth token → `localStorage` via `utils/storage.ts`. Never persist sensitive data beyond token.
- No Redux, Zustand, or external state libraries — keep it Context + hooks.

## Styling

- **Primary UI**: Chakra UI 2.8 components with custom theme (`src/theme.ts`).
- **Custom theme**:
  - Brand color: `brand.500 = #ef4444` (red/orange palette)
  - Font: Inter
  - Custom shadows: `card`, `cardHover`, `soft`, `glow`
  - Button variants: `brand`, `brandOutline`, `ghost`
- **Global CSS**: `src/style.css` for resets and body-level styles.
- **Inline styles**: Avoid — use Chakra props (`color`, `mt`, `px`, etc.) or theme tokens.
- **Class names**: Not used — Chakra UI is CSS-in-JS via Emotion.

## Adding a New Page/Route

1. Create `src/pages/MyNewPage.tsx`
2. Add route in `src/App.tsx`:
   ```tsx
   <Route path="/my-path" element={<ProtectedRoute><MyNewPage /></ProtectedRoute>} />
   ```
3. Add nav link in `src/components/common/Header.tsx` if needed.
4. Export types needed from `src/types/index.ts`.

## Calling the Backend

All API calls go through the service layer. The Axios instance in `src/services/api.ts` handles:
- `baseURL`: `http://localhost:8000/api` (proxied to `:8000` via Vite config)
- JWT injection via request interceptor (reads `auth_token` from localStorage)
- 401 handling via response interceptor (clears storage, redirects to `/login`)

```ts
// Good — call the service
import { workflowService } from '@/services/workflow.service'
const workflows = await workflowService.getWorkflows()

// Bad — never call axios directly in a component
import axios from 'axios'
const res = await axios.get('/api/workflows')
```

Adding a new API call:
1. Add method to the appropriate service file (`workflow.service.ts` or `auth.service.ts`).
2. Use the shared `api` Axios instance, not a new one.

## Import Aliases

Vite is configured with `@` resolving to `src/`:

```ts
import { useAuth } from '@/context/AuthContext'
import type { Execution } from '@/types'
import { workflowService } from '@/services/workflow.service'
```

## Patterns

**Fetching data in a component:**
```tsx
// Before — inline fetch
const [data, setData] = useState([])
useEffect(() => { axios.get('/api/workflows').then(r => setData(r.data)) }, [])

// After — use service + hook pattern
const [workflows, setWorkflows] = useState<WorkflowConfig[]>([])
useEffect(() => {
  workflowService.getWorkflows().then(setWorkflows)
}, [])
```

**Protected pages:**
```tsx
// Before — manually check auth in every page
if (!user) return <Navigate to="/login" />

// After — wrap in ProtectedRoute in App.tsx
<Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
```

**Chakra UI styling:**
```tsx
// Before — inline style
<div style={{ marginTop: '16px', color: 'red' }}>

// After — Chakra props
<Box mt={4} color="brand.500">
```

**Type definitions:**
```ts
// Before — inline anonymous types
const [user, setUser] = useState<{ id: number; email: string } | null>(null)

// After — import from types/index.ts
import type { User } from '@/types'
const [user, setUser] = useState<User | null>(null)
```

**Hook for async status polling:**
```tsx
// Use useExecutionStatus — don't write polling loops in components
const { execution, loading, cancelExecution } = useExecutionStatus(executionId)
```

## Never Do

- Never import Axios directly in a component — all HTTP goes through `services/`.
- Never store sensitive data beyond `auth_token` and `user_data` in localStorage.
- Never define TypeScript interfaces inline in components — add them to `src/types/index.ts`.
- Never use class components or `this` — functional components with hooks only.
- Never add global styles in component files — use `style.css` or Chakra theme tokens.
