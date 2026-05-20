# Basic Validation

Learn the basics of validating data with LaraNode's validator.

## validate() Function

```typescript
import { validate } from '@lara-node/validator'

const validated = validate(data, rules)
```

Returns validated and coerced data, or throws `ValidationError`.

## Basic Rules

```typescript
const data = validate(req.body, {
  name: 'required|string|max:255',
  email: 'required|email',
  age: 'required|integer|min:18',
})
```

## Rule Syntax

Rules are pipe-separated:

```
'required|string|max:255'
```

Parameters use colons:

```
'between:18,100'
'in:admin,user,moderator'
```

## Array Validation

```typescript
const data = validate(req.body, {
  tags: 'required|array',
  'tags.*': 'string|max:50',
})
```

## Nested Objects

```typescript
const data = validate(req.body, {
  user: 'required',
  'user.name': 'required|string',
  'user.email': 'required|email',
  'user.address.street': 'required|string',
  'user.address.city': 'required|string',
})
```

## Handling Errors

```typescript
import { ValidationError } from '@lara-node/validator'

try {
  const data = validate(req.body, rules)
} catch (error) {
  if (error instanceof ValidationError) {
    // error.errors -- rule codes
    // error.messages -- human-readable messages

    return res.status(422).json({
      errors: error.messages,
    })
  }
}
```

## Nullable Fields

```typescript
const data = validate(req.body, {
  bio: 'nullable|string|max:500',
  website: 'nullable|url',
})
```

## Sometimes

Only validate if the field is present:

```typescript
const data = validate(req.body, {
  email: 'sometimes|email',
})
```

## Next Steps

- [Validation Rules](/packages/validator/rules) -- All available rules
- [Custom Rules](/packages/validator/custom-rules) -- Custom validation
- [Error Messages](/packages/validator/messages) -- Custom messages
