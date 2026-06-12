# Form Request

The `FormRequest` is a Laravel-inspired request validation class that encapsulates validation logic, authorization, and input handling into a single, type-safe class. When type-hinted in a controller method, the router automatically instantiates it, runs validation, and injects it — returning a `422` response on failure.

## Overview

A `FormRequest` subclass declares its validation rules in a `rules()` method. The router detects it via TypeScript decorator metadata, creates an instance with the incoming Express request, and calls `validate()` before the controller runs.

## Creating a FormRequest

```typescript
import { FormRequest } from "@lara-node/core";

class StoreUserRequest extends FormRequest {
  rules() {
    return {
      name: "required|string|max:255",
      email: "required|email|unique:users,email",
      password: "required|string|min:8|confirmed",
    };
  }
}
```

## Usage in Controller

Type-hint the request class in your controller method. The router resolves, validates, and injects it automatically:

```typescript
import { Controller, Route } from "@lara-node/router";

@Route("/api/users")
export class UserController {
  @Route.post("/")
  async store(req: StoreUserRequest, res: Response) {
    // Validation already passed — req is a StoreUserRequest instance
    const data = req.validated();
    // data is typed as Record<string, any>
  }
}
```

Or with the tuple syntax:

```typescript
router.post("/api/users", [UserController, "store"]);
```

## Available Methods

| Method               | Description                                    |
| -------------------- | ---------------------------------------------- |
| `validated()`        | Returns the validated data (`T`)               |
| `safe()`             | Returns a shallow copy of validated data       |
| `errors()`           | Returns field-keyed error messages             |
| `fails()`            | `true` if validation failed                    |
| `passed()`           | `true` if validation passed                    |
| `validate()`         | Runs validation manually                       |
| `input(key?, default?)` | Get input from body, query, or params      |
| `only(...keys)`      | Get only the specified input fields            |
| `except(...keys)`    | Get all input except the specified fields      |
| `bearerToken()`      | Extract Bearer token from Authorization header |

### Request Passthrough

The FormRequest exposes the most common Express request properties directly:

```typescript
req.body     // Request body
req.query    // Query parameters
req.params   // Route parameters
req.headers  // Request headers
req.ip       // Client IP
req.method   // HTTP method
req.path     // Request path
req.url      // Request URL
req.originalUrl // Original URL
```

Access the underlying Express request via `getRequest()`:

```typescript
const expressReq = req.getRequest();
```

## Authorization

Override `authorize()` to control access. Returning `false` throws a `ValidationError` with a `422` response:

```typescript
class UpdateUserRequest extends FormRequest {
  authorize(): boolean {
    const user = this.getRequest().user;
    return user?.id === this.params.id;
  }

  rules() {
    return {
      name: "string|max:255",
      email: "email|unique:users,email",
    };
  }
}
```

## Custom Error Messages

Override `messages()` to customize validation error messages:

```typescript
class LoginRequest extends FormRequest {
  rules() {
    return {
      email: "required|email",
      password: "required|min:8",
    };
  }

  messages(): Record<string, string> {
    return {
      "email.required": "An email address is required.",
      "email.email": "Provide a valid email address.",
      "password.min": "Password must be at least 8 characters.",
    };
  }
}
```

## Generic Return Type

The `FormRequest<T>` generic lets you type the return of `validated()`:

```typescript
interface CreateUserData {
  name: string;
  email: string;
  password: string;
}

class StoreUserRequest extends FormRequest<CreateUserData> {
  rules() {
    return {
      name: "required|string|max:255",
      email: "required|email",
      password: "required|string|min:8",
    };
  }
}

// In controller:
const data = req.validated(); // type: CreateUserData
data.name; // string
data.email; // string
```

## Manual Validation

You can also instantiate and validate a FormRequest manually outside the router:

```typescript
const expressReq = getFromSomewhere();
const request = new LoginRequest(expressReq);

try {
  await request.validate();
  const data = request.validated();
} catch (error) {
  console.error(request.errors());
}
```

## How Auto-Detection Works

The router uses `Reflect.getMetadata("design:paramtypes")` (emitted by TypeScript's `emitDecoratorMetadata`) to inspect controller method parameter types at runtime. When the first parameter extends `FormRequest`, the router:

1. Instantiates the class with the Express `req`
2. Calls `validate()` automatically
3. On success, passes the FormRequest instance to the controller
4. On failure, returns a `422` JSON response with error messages

This requires `experimentalDecorators` and `emitDecoratorMetadata` in your `tsconfig.json` (both are already set by default).

## Next Steps

- [Validator Package](/packages/validator) -- Validation engine and rule reference
- [Router Controllers](/packages/router/controllers) -- Controller usage
- [Validation Rules](/packages/validator/rules) -- All available validation rules
