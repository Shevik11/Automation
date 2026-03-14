### Components Rules & Patterns

#### Overview
Reusable UI components organized by domain into subdirectories.

#### Structure
- `auth/` — Authentication components (login forms, protected routes).
- `common/` — Shared generic components (buttons, modals, layouts).
- `workflow/` — Workflow-specific components (cards, forms, execution displays).

#### Rules
- All components are functional React components written in TypeScript (`.tsx`).
- Props must be defined with explicit TypeScript interfaces or types.
- Components should be self-contained — avoid reaching into parent state directly; use props and callbacks.
- Use custom hooks from `hooks/` for data fetching and shared logic.
- Use services from `services/` for API calls — never import Axios directly in components.
- Group related components in domain subdirectories; shared components go in `common/`.

#### Naming
- **Files**: PascalCase matching the component name (e.g., `WorkflowCard.tsx`).
- **Components**: PascalCase named exports (e.g., `export const WorkflowCard`).
- **Props interfaces**: `{ComponentName}Props` (e.g., `WorkflowCardProps`).
