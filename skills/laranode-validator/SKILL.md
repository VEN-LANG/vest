---
name: laranode-validator
description: >-
  Laravel-inspired validation with 50+ rules, dot-notation nested fields, wildcard
  patterns, custom error messages, type coercion, and custom rules. Activates for
  questions about validate(), ValidationError, RuleFn, or specific rules like
  required, email, unique, min, max, between, confirmed.
---

# @lara-node/validator

Laravel-inspired validation engine with 50+ rules.

## Key Exports

| Export | Description |
|--------|-------------|
| `validate(data, rules, messages?)` | Main validation function |
| `ValidationError` | Error class with `errors` property |
| `RuleFn` | Custom rule type signature |
| `requiredIf(condition)` | Conditional required |
| `fileRule` | File validation |
| `mimes(...types)` | MIME type validation |
| `maxFileSize(max)` | File size validation |
| `phoneRule` | Phone number validation |
| `creditCardRule` | Credit card validation |

## Quick Start

```typescript
import { validate } from "@lara-node/validator";

const data = validate(req.body, {
  name: "required|string|max:255",
  email: "required|email|unique:users,email",
  password: "required|min:8|confirmed",
  age: "integer|between:18,100",
});
```

## Custom Rules

```typescript
import { validate, RuleFn } from "@lara-node/validator";

const mustBeFoo: RuleFn = (value) =>
  value === "foo" ? null : "Value must be 'foo'";

const data = validate(input, {
  name: [mustBeFoo],
});
```
