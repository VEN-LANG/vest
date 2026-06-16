# Error Messages

Customize validation error messages.

## Default Messages

By default, validation errors include human-readable messages:

```typescript
try {
  validate(data, rules);
} catch (error) {
  console.log(error.messages);
  // {
  //   name: ['The name field is required'],
  //   email: ['The email must be a valid email address'],
  // }
}
```

## Custom Messages

Pass custom messages as the third argument:

```typescript
validate(req.body, rules, {
  "name.required": "Please enter your name",
  "email.required": "Email address is required",
  "email.email": "Please provide a valid email address",
  "password.min": "Password must be at least 8 characters",
});
```

## Field-Specific Messages

```typescript
validate(req.body, rules, {
  "name.required": "What should we call you?",
  "email.unique": "This email is already registered",
});
```

## Rule-Specific Messages

```typescript
validate(req.body, rules, {
  required: "This field is required",
  email: "Must be a valid email",
  "min.string": "Must be at least :min characters",
});
```

## Error Structure

```typescript
interface ValidationError {
  errors: Record<string, string[]>; // Rule codes
  messages: Record<string, string[]>; // Human-readable
}
```

## Usage in Express

```typescript
import { validate, ValidationError } from "@lara-node/validator";

Route.post("/users", async (req, res) => {
  try {
    const data = validate(req.body, {
      name: "required|string",
      email: "required|email|unique:users",
    });

    const user = await User.create(data);
    return user;
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(422).json({
        message: "Validation failed",
        errors: error.messages,
      });
    }
    throw error;
  }
});
```

## Next Steps

- [Validation Rules](/packages/validator/rules) -- All rules
- [Custom Rules](/packages/validator/custom-rules) -- Custom validation
- [Basic Usage](/packages/validator/basic) -- Get started
