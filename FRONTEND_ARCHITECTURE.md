### Frontend Architecture: React & TypeScript

The frontend is a modern React application built with TypeScript and Vite, providing a responsive dashboard for automation management.

#### Tech Stack
- **Framework**: React (v18+)
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Context API (AuthContext) and Custom Hooks.

#### Key Directory Structure (`frontend/src/`)
- `components/`:
  - `auth/`: Login and Register forms.
  - `workflow/`: UnifiedWorkflowForm, WorkflowSelector, ExecutionForm, and ExecutionStatus.
  - `common/`: Header, ProtectedRoute, and reusable UI elements.
- `context/`: `AuthContext.tsx` manages user sessions and authentication state.
- `hooks/`: `useAuth`, `useWorkflow`, and `useExecutionStatus` encapsulate complex logic and API calls.
- `services/`:
  - `api.ts`: Central Axios configuration with interceptors for auth headers.
  - `auth.service.ts`: API wrappers for login, registration, and logout.
  - `workflow.service.ts`: API wrappers for workflow management and executions.
- `pages/`: High-level views (HomePage, LoginPage, DashboardPage, WorkflowPage, ExecutionsHistoryPage).
- `types/`: TypeScript interfaces and types for all major entities (User, Workflow, Execution, Result).

#### Authentication & State Flow
- **Auth Flow**: Users log in via `LoginForm`, which updates `AuthContext`. Tokens are stored in local storage and included in subsequent API calls via `api.ts` interceptors.
- **Workflow Flow**: `DashboardPage` uses `useWorkflow` hook to fetch and manage workflows. `UnifiedWorkflowForm` allows creating and editing workflows.
- **Execution Monitoring**: `useExecutionStatus` hook provides real-time-like polling or updates for workflow progress.

#### API Communication
- All communication with the backend is done through standard REST APIs via Axios.
- Error handling is centralized in the `api.ts` service.
