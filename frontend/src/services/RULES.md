### Services Rules & Patterns

#### Overview
API communication layer using Axios. All HTTP requests to the backend are centralized here.

#### Rules
- `api.ts` is the shared Axios instance with base URL, auth interceptors, and error handling.
- All service modules import and use the shared `api` instance — never create standalone Axios instances.
- Service files export functions or objects that wrap API calls with typed parameters and return types.
- Request interceptor automatically attaches the Bearer token from `utils/storage.ts`.
- Response interceptor handles 401 errors globally (clears storage, redirects to login).
- Components and hooks consume services — services must not import from components.

#### Naming
- **Shared instance**: `api.ts`.
- **Domain services**: `{domain}.service.ts` in camelCase (e.g., `auth.service.ts`, `workflow.service.ts`).
