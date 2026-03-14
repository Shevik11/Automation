### Pages Rules & Patterns

#### Overview
Top-level page components that serve as route targets. Each file represents a distinct application view.

#### Rules
- One page component per file.
- Pages compose components from `components/` — avoid complex inline UI logic.
- Pages use custom hooks from `hooks/` for data fetching and state management.
- Pages handle route-level concerns: loading states, error boundaries, and redirects.

#### Naming
- **Files**: PascalCase with `Page` suffix (e.g., `DashboardPage.tsx`, `LoginPage.tsx`, `WorkflowPage.tsx`).
- **Components**: Match the file name (e.g., `DashboardPage`).
