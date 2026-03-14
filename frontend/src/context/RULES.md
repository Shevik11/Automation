### Context Rules & Patterns

#### Overview
React Context providers for global application state (e.g., authentication).

#### Rules
- Each context file exports a Context object, a Provider component, and a consumer hook.
- Provider components wrap the application (or a subtree) in `App.tsx` or route layout.
- Context values must be typed with explicit TypeScript interfaces.
- Keep context lean — only store truly global state (auth, theme, etc.); prefer hooks for domain-specific state.

#### Naming
- **Files**: PascalCase with `Context` suffix (e.g., `AuthContext.tsx`).
- **Context**: `{Name}Context` (e.g., `AuthContext`).
- **Provider**: `{Name}Provider` (e.g., `AuthProvider`).
