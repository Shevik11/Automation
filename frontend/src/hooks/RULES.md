### Hooks Rules & Patterns

#### Overview
Custom React hooks encapsulating reusable stateful logic, data fetching, and side effects.

#### Rules
- Each hook is a single function exported from its own file.
- Hooks may call services from `services/` for API communication.
- Hooks may consume React Context via `useContext`.
- Hooks return typed objects or tuples with state values and handler functions.
- Keep hooks focused on a single concern (e.g., auth state, workflow data, execution polling).

#### Naming
- **Files**: camelCase with `use` prefix (e.g., `useAuth.ts`, `useWorkflow.ts`, `useExecutionStatus.ts`).
- **Exports**: function name matches the file name (e.g., `export function useAuth()`).
