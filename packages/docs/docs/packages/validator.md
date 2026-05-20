# Validator Package

The `@lara-node/validator` package provides a Laravel-inspired validation engine with 50+ rules.

## Installation

```bash
pnpm add @lara-node/validator
```

## Overview

Features include:

- **50+ validation rules** matching Laravel's API
- **Dot-notation** for nested fields
- **Wildcard patterns** for arrays
- **Custom error messages**
- **Type coercion**
- **Custom validation rules**

## Quick Start

```typescript
import { validate } from '@lara-node/validator'

const data = validate(req.body, {
  name: 'required|string|max:255',
  email: 'required|email|unique:users,email',
  password: 'required|min:8|confirmed',
  age: 'integer|between:18,100',
})
```

## Key Exports

| Export | Description |
|--------|-------------|
| `validate()` | Main validation function |
| `ValidationError` | Error with messages |
| `RuleFn` | Custom rule type |
| `requiredIf()` | Conditional required |
| `fileRule` | File validation |
| `mimes()` | MIME type validation |
| `maxFileSize()` | File size validation |
| `phoneRule` | Phone validation |
| `creditCardRule` | Credit card validation |

## Next Steps

- [Basic Usage](/packages/validator/basic) -- Get started
- [Validation Rules](/packages/validator/rules) -- All rules
- [Custom Rules](/packages/validator/custom-rules) -- Custom validation
