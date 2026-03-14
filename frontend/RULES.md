### Frontend Rules & Patterns

#### Technology Stack
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **Styling**: CSS (component-scoped)

#### Project Structure
```
frontend/src/
├── components/    # Reusable UI components (grouped by domain)
│   ├── auth/      # Authentication-related components
│   ├── common/    # Shared/generic components
│   └── workflow/  # Workflow-specific components
├── context/       # React Context providers (global state)
├── hooks/         # Custom React hooks
├── pages/         # Top-level page components (route targets)
├── services/      # API service modules (Axios-based)
├── types/         # TypeScript type definitions
└── utils/         # Utility/helper functions
```

#### General Rules
- All components and modules use TypeScript (`.tsx` / `.ts`).
- Use functional components with hooks — no class components.
- State management via React Context (`context/`) and custom hooks (`hooks/`).
- API calls are centralized in `services/` — components never call Axios directly.
- Authentication token is managed via `utils/storage.ts` and injected by Axios interceptors.

#### Naming Conventions
- **Component files**: PascalCase (e.g., `DashboardPage.tsx`, `LoginPage.tsx`).
- **Non-component files**: camelCase (e.g., `api.ts`, `useAuth.ts`, `storage.ts`).
- **Service files**: camelCase with `.service.ts` suffix (e.g., `auth.service.ts`, `workflow.service.ts`).
- **Hook files**: camelCase with `use` prefix (e.g., `useAuth.ts`, `useWorkflow.ts`).
- **Type files**: camelCase (e.g., `index.ts`).

#### Import Order
1. React and third-party library imports
2. Local components and modules (relative paths with `../`)
3. Types and utilities
