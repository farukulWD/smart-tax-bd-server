# CLAUDE.md — Smart Tax BD Server

## Project Overview
Node.js/Express/TypeScript backend for the Smart Tax BD platform. Handles user management, tax processing, payments (SSLCommerz), file uploads (Cloudinary), OCR (Tesseract.js), real-time notifications (Socket.io), and background jobs (RabbitMQ, node-cron).

---

## Commands

```bash
pnpm dev      # Development mode with auto-reload (ts-node-dev)
pnpm build    # Compile TypeScript → dist/
pnpm start    # Run compiled server from dist/server.js
```

---

## Architecture: Modular Feature-Based

Every feature lives in its own folder under `src/app/module/[FeatureName]/`.

### Required files per module

| File | Responsibility |
|---|---|
| `[name].interface.ts` | TypeScript interfaces & types |
| `[name].model.ts` | Mongoose schema & model |
| `[name].validation.ts` | Zod validation schemas |
| `[name].service.ts` | Business logic only |
| `[name].controller.ts` | HTTP layer (no business logic) |
| `[name].route.ts` | Express Router with middleware |
| `[name].constant.ts` | Module-level constants/enums (if needed) |

### Adding a new feature
1. Create `src/app/module/[FeatureName]/` with all files above.
2. Register the route in `src/app/routes/routes.ts` by adding to the `moduleRoutes` array:
   ```typescript
   { path: '/feature-name', route: FeatureRoutes }
   ```

---

## Key Utilities — Always Use These

### `catchAsync` (`src/app/utils/catchAsync.ts`)
Wrap every async controller function. Never use try/catch in controllers.
```typescript
import catchAsync from '../../utils/catchAsync';

const myHandler = catchAsync(async (req, res) => {
  // ...
});
```

### `sendResponse` (`src/app/utils/sendResponse.ts`)
All responses must use this helper for consistency.
```typescript
import sendResponse from '../../utils/sendResponse';

sendResponse(res, {
  statusCode: httpStatus.OK,
  success: true,
  message: 'Data retrieved successfully',
  data: result,
  // meta: { page, limit, total, totalPage } — for paginated responses
});
```

### `AppError` (`src/app/errors/AppError.ts`)
Throw this for all custom errors in service layer.
```typescript
throw new AppError(httpStatus.NOT_FOUND, 'Resource not found');
```

---

## Middleware Usage

### Auth middleware (`src/app/middlewares/auth.ts`)
```typescript
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';

router.get('/admin-only', auth(USER_ROLE.admin), controller.handler);
router.get('/any-user', auth(USER_ROLE.user, USER_ROLE.admin), controller.handler);
```
Attaches decoded JWT payload to `req.user`.

### Request validation (`src/app/middlewares/validateRequest.ts`)
```typescript
import validateRequest from '../../middlewares/validateRequest';
import { MyValidation } from './my.validation';

router.post('/', validateRequest(MyValidation.createSchema), controller.create);
```

---

## Validation — Use Zod

All request validation uses Zod. Define schemas in `[name].validation.ts`:
```typescript
import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }),
  }),
});

export const MyValidation = { createSchema };
```

---

## Service Layer Conventions
- Services contain all business logic; controllers only handle HTTP.
- Export services as a named object: `export const MyServices = { create, getAll, ... }`.
- Throw `AppError` on business rule violations.
- Never access `req`/`res` inside a service.

## Controller Layer Conventions
- Always wrap with `catchAsync`.
- Call service, then call `sendResponse`.
- Export controllers as a named object: `export const MyControllers = { create, getAll, ... }`.

---

## Database (Mongoose)
- Use TypeScript interfaces for document types.
- Implement `UserModel`-style static methods pattern for custom queries.
- Sensitive fields (passwords) use `select: 0` in schema.
- Use pre/post hooks for data transformation (e.g., password hashing).

---

## Error Handling
- Global error handler in `src/app/middlewares/globalErrorhandler.ts` handles:
  - Zod errors → `handleZodError`
  - Mongoose validation errors → `handleValidationError`
  - Mongoose cast errors → `handleCastError`
  - Duplicate key errors → `handleDuplicateError`
  - Custom `AppError` instances
- Use `http-status` package for status codes (never hardcode numbers).

---

## Environment & Config
- All environment variables accessed via `src/app/config/index.ts` — never use `process.env` directly in modules.
- Add new env variables to `config/index.ts` and `.env`.

---

## TypeScript Notes
- Strict mode is enabled.
- Global `req.user` type is augmented in `src/app/interface/`.
- `esModuleInterop: true` — use default imports for CommonJS modules.
- Target: ES2016, module: CommonJS.

---

## Code Style
- ESLint + Prettier enforced.
- `prefer-const`, `no-unused-vars`, `no-console` (warn) rules active.
- Run linting before committing.

---

## Existing Modules (reference implementations)
- `src/app/module/users/` — user management, RBAC
- `src/app/module/Auth/` — JWT authentication
- `src/app/module/Tax/` — tax document processing
- `src/app/module/payments/` — SSLCommerz payment flow
- `src/app/module/files/` — Cloudinary file uploads
- `src/app/module/updateNews/` — news CRUD
- `src/app/module/Dashboard/` — dashboard aggregations
