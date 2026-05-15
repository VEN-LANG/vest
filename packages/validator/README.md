# @lara-node/validator

Laravel-inspired validation engine for Lara-Node applications.

## Installation

```bash
pnpm add @lara-node/validator
```

## Usage

```typescript
import { validate, ValidationError } from '@lara-node/validator';

const data = await validate(req.body, {
  name:     'required|string|min:2|max:100',
  email:    'required|email|unique:users,email',
  password: 'required|string|min:8|confirmed',
  age:      'required|integer|min:18|max:120',
  role:     'nullable|in:admin,user,moderator',
});
```

If validation fails, a `ValidationError` is thrown with an `errors` map and `messages` array.

## Built-in Rules

### Presence
| Rule | Description |
|------|-------------|
| `required` | Field must be present and non-empty |
| `nullable` | Field may be null/undefined (stops further rules) |
| `sometimes` | Only validate if the field is present |

### Type
| Rule | Description |
|------|-------------|
| `string` | Must be a string |
| `integer` | Must be an integer |
| `numeric` | Must be a number |
| `boolean` | Must be true/false/1/0/'true'/'false' |
| `array` | Must be an array |
| `json` | Must be valid JSON |

### String
| Rule | Description |
|------|-------------|
| `min:n` | Minimum length (string) or value (number) |
| `max:n` | Maximum length (string) or value (number) |
| `between:min,max` | Length or value between min and max |
| `size:n` | Exact length |
| `email` | Valid email address |
| `url` | Valid URL |
| `uuid` | Valid UUID |
| `regex:/pattern/` | Must match regex |
| `starts_with:prefix` | Must start with prefix |
| `ends_with:suffix` | Must end with suffix |
| `contains:str` | Must contain str |
| `phone` | Valid phone number (E.164 or common formats) |

### Comparison
| Rule | Description |
|------|-------------|
| `in:a,b,c` | Value must be one of the listed values |
| `not_in:a,b,c` | Value must not be one of the listed values |
| `gt:n` | Greater than n |
| `gte:n` | Greater than or equal to n |
| `lt:n` | Less than n |
| `lte:n` | Less than or equal to n |
| `same:field` | Must equal another field |
| `different:field` | Must not equal another field |
| `confirmed` | Must equal `field_confirmation` |
| `accepted` | Must be truthy (true/1/'yes'/'on') |
| `declined` | Must be falsy (false/0/'no'/'off') |

### Date
| Rule | Description |
|------|-------------|
| `date` | Valid date string |
| `date_format:format` | Must match specific format |
| `before:date` | Must be before a given date |
| `after:date` | Must be after a given date |
| `time` | Valid time string (HH:MM or HH:MM:SS) |
| `datetime` | Valid datetime string |
| `timezone` | Valid timezone identifier |

### Database
| Rule | Description |
|------|-------------|
| `exists:table,column` | Record must exist in DB |
| `unique:table,column` | Value must not exist in DB |

## Rule Spec Objects

For more control, use a `RuleSpec` object instead of a pipe-delimited string:

```typescript
const data = await validate(body, {
  email: {
    rule: 'required|email|unique:users,email',
    message: 'Please provide a valid, unique email address.',
  },
  age: {
    rule: 'required|integer|between:18,120',
    messages: {
      required: 'Age is required.',
      between:  'You must be between 18 and 120 years old.',
    },
  },
});
```

## Custom Rule Functions

```typescript
import { validate, RuleFn } from '@lara-node/validator';

const isEvenNumber: RuleFn = (value, field) => {
  if (value % 2 !== 0) return `${field} must be an even number`;
  return null;
};

await validate(body, { quantity: isEvenNumber });
```

## Conditional Rules

```typescript
import { requiredIf, requiredUnless } from '@lara-node/validator';

await validate(body, {
  // required only when type === 'business'
  company_name: requiredIf('type', 'business'),

  // required unless type is 'guest'
  email: requiredUnless('type', 'guest'),
});
```

## File Validation

```typescript
import { fileRule, mimes, maxFileSize } from '@lara-node/validator';

await validate({ file: req.file }, {
  file: [
    fileRule(),                                   // must be a multer file object
    mimes(['image/jpeg', 'image/png', 'image/webp']),
    maxFileSize(5 * 1024 * 1024),                 // 5 MB
  ],
});
```

## Nested Objects

```typescript
import { nestedRule, arrayOfObjectsRule } from '@lara-node/validator';

await validate(body, {
  address: nestedRule({
    street: 'required|string',
    city:   'required|string',
    zip:    'required|string|min:4',
  }),
  items: arrayOfObjectsRule({
    product_id: 'required|integer|exists:products,id',
    quantity:   'required|integer|min:1',
  }),
});
```

## Express Integration

The `@lara-node/middlewares` package attaches `req.validate()` via `ValidatorMiddleware`:

```typescript
import { ValidatorMiddleware } from '@lara-node/middlewares';

app.use((req, res, next) => new ValidatorMiddleware().handle(req as any, res, next));

// In controllers:
const data = await req.validate({
  email: 'required|email',
  password: 'required|string|min:8',
});
```

## Error Handling

```typescript
import { ValidationError } from '@lara-node/validator';

try {
  const data = await validate(body, rules);
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.errors);   // { email: ['The email field is required.'] }
    console.log(err.messages); // ['The email field is required.']
  }
}
```

The `ErrorHandlerMiddleware` from `@lara-node/middlewares` automatically catches `ValidationError` and returns HTTP 422.

## Custom Messages

```typescript
await validate(body, rules, {
  'name.required': 'Please enter your full name.',
  'email.email':   'That doesn\'t look like a valid email.',
  'age.min':       'You must be at least 18 years old.',
});
```

## License

MIT
