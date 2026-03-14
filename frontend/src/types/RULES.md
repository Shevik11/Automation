### Types Rules & Patterns

#### Overview
Shared TypeScript type definitions and interfaces used across the frontend.

#### Rules
- Define all shared types and interfaces here — avoid inline type definitions in components.
- Use `interface` for object shapes and `type` for unions, intersections, and aliases.
- Export all types from `index.ts` as the single entry point.
- Types should mirror backend response schemas where applicable.

#### Naming
- **Interfaces**: PascalCase (e.g., `User`, `Workflow`, `Execution`).
- **Type aliases**: PascalCase (e.g., `WorkflowStatus`, `AuthState`).
- **Files**: camelCase (e.g., `index.ts`).
