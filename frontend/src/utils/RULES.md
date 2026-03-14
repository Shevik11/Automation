### Utils Rules & Patterns

#### Overview
Pure utility/helper functions shared across the frontend application.

#### Rules
- Utility functions must be pure where possible — no side effects, no React dependencies.
- Each file groups related helpers by concern (e.g., `date.ts` for date formatting, `storage.ts` for localStorage).
- `storage.ts` provides a typed wrapper around `localStorage` for token and user data management.
- Utils must not import from components, hooks, or context to avoid circular dependencies.

#### Naming
- **Files**: camelCase describing the concern (e.g., `date.ts`, `storage.ts`).
- **Functions**: camelCase (e.g., `getToken`, `formatDate`).
