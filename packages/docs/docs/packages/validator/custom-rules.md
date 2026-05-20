# Custom Rules

Create custom validation rules for your specific needs.

## Custom Rule Functions

```typescript
import { validate } from '@lara-node/validator'

const data = validate(req.body, {
  username: [
    'required',
    'string',
    (value: any) => {
      if (!/^[a-z0-9_]+$/.test(value)) {
        return 'Username can only contain lowercase letters, numbers, and underscores'
      }
      return true
    },
  ],
})
```

## Rule Function Signature

```typescript
type RuleFn = (value: any, payload: any, field: string) => string | boolean
```

Return `true` if valid, or a string error message if invalid.

## Reusable Custom Rules

```typescript
function isStrongPassword(value: any): string | boolean {
  if (typeof value !== 'string') return 'Password must be a string'
  if (value.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(value)) return 'Password must contain uppercase letter'
  if (!/[0-9]/.test(value)) return 'Password must contain a number'
  if (!/[!@#$%^&*]/.test(value)) return 'Password must contain special character'
  return true
}

const data = validate(req.body, {
  password: ['required', isStrongPassword],
})
```

## Built-in Custom Rules

### requiredIf / requiredUnless

```typescript
import { requiredIf, requiredUnless } from '@lara-node/validator'

const data = validate(req.body, {
  shipping_address: requiredIf('use_shipping', true),
  company_name: requiredUnless('account_type', 'personal'),
})
```

### File Validation

```typescript
import { fileRule, mimes, maxFileSize } from '@lara-node/validator'

const data = validate(req.body, {
  avatar: [fileRule, mimes('jpg', 'png', 'gif'), maxFileSize(2)],
})
```

### Phone Validation

```typescript
import { phoneRule } from '@lara-node/validator'

const data = validate(req.body, {
  phone: ['required', phoneRule],
})
```

### Credit Card Validation

```typescript
import { creditCardRule } from '@lara-node/validator'

const data = validate(req.body, {
  card_number: ['required', creditCardRule],
})
```

### Nested Rules

```typescript
import { nestedRule, arrayOfObjectsRule } from '@lara-node/validator'

const data = validate(req.body, {
  address: nestedRule({
    street: 'required|string',
    city: 'required|string',
    zip: 'required|string|size:5',
  }),
  items: arrayOfObjectsRule({
    name: 'required|string',
    quantity: 'required|integer|min:1',
  }),
})
```

## Next Steps

- [Validation Rules](/packages/validator/rules) -- All rules
- [Error Messages](/packages/validator/messages) -- Custom messages
- [Basic Usage](/packages/validator/basic) -- Get started
