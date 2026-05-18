# @lara-node/validator

Laravel-inspired validation engine — built-in rules, custom rules, async validation, and typed error messages.

## Installation

```sh
pnpm add @lara-node/validator
```

## Quick Start

```ts
import { validate, ValidationError } from '@lara-node/validator';

const data = await validate(req.body, {
  name:     'required|string|min:2|max:100',
  email:    'required|email|unique:users,email',
  password: 'required|string|min:8|confirmed',
  age:      'required|integer|min:18|max:120',
  role:     'nullable|in:admin,user,moderator',
});
```

If validation fails, a `ValidationError` is thrown containing `errors` (field-keyed) and `messages` (flat array). The `ErrorHandlerMiddleware` from `@lara-node/middlewares` catches it and returns HTTP 422 automatically.

## API

### `validate(data, rules, messages?)`

```ts
import { validate } from '@lara-node/validator';

const data = await validate(
  req.body,
  { email: 'required|email' },
  { 'email.required': 'Please enter your email address.' },
);
```

Returns the validated (and type-cast) data on success. Throws `ValidationError` on failure.

### `ValidationError`

```ts
import { ValidationError } from '@lara-node/validator';

try {
  const data = await validate(body, rules);
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.errors);
    // { email: ['The email field is required.'], name: ['The name field is required.'] }

    console.log(err.messages);
    // ['The email field is required.', 'The name field is required.']
  }
}
```

### `RuleSpec` — object-style rules

Use a `RuleSpec` object to specify per-rule messages alongside the rule string:

```ts
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

## Built-in Rules

### Presence

| Rule              | Description                                                  |
|-------------------|--------------------------------------------------------------|
| `required`        | Field must be present and non-empty                          |
| `nullable`        | Field may be null/undefined (stops further rule checks)      |
| `sometimes`       | Only validate if the field is present in the input           |

### Type

| Rule      | Description                                          |
|-----------|------------------------------------------------------|
| `string`  | Must be a string                                     |
| `integer` | Must be an integer                                   |
| `numeric` | Must be a number (integer or float)                  |
| `boolean` | Must be `true`, `false`, `1`, `0`, `'true'`, `'false'` |
| `array`   | Must be an array                                     |
| `object`  | Must be a plain object                               |
| `json`    | Must be valid JSON                                   |

### String

| Rule                 | Description                                         |
|----------------------|-----------------------------------------------------|
| `min:n`              | Minimum length (string) or minimum value (number)   |
| `max:n`              | Maximum length (string) or maximum value (number)   |
| `between:n,m`        | Length or value between `n` and `m`                 |
| `size:n`             | Exact length                                        |
| `email`              | Valid email address                                 |
| `url`                | Valid URL                                           |
| `uuid`               | Valid UUID                                          |
| `ip`                 | Valid IPv4 or IPv6 address                          |
| `alpha`              | Letters only                                        |
| `alpha_num`          | Letters and numbers only                            |
| `alpha_dash`         | Letters, numbers, dashes, and underscores           |
| `regex:/pattern/`    | Must match the given regular expression             |
| `starts_with:prefix` | Must start with the given prefix                    |
| `ends_with:suffix`   | Must end with the given suffix                      |
| `contains:str`       | Must contain the given substring                    |
| `digits:n`           | Exactly `n` digits                                  |
| `digits_between:n,m` | Between `n` and `m` digits                          |

### Comparison

| Rule                   | Description                                              |
|------------------------|----------------------------------------------------------|
| `in:a,b,c`             | Value must be one of the listed values                   |
| `not_in:a,b,c`         | Value must not be one of the listed values               |
| `same:field`           | Must equal the value of another field                    |
| `different:field`      | Must differ from the value of another field              |
| `confirmed`            | Must equal `{field}_confirmation`                        |
| `accepted`             | Must be truthy (`true`, `1`, `'yes'`, `'on'`)            |
| `declined`             | Must be falsy (`false`, `0`, `'no'`, `'off'`)            |
| `gt:n`                 | Greater than `n`                                         |
| `gte:n`                | Greater than or equal to `n`                             |
| `lt:n`                 | Less than `n`                                            |
| `lte:n`                | Less than or equal to `n`                                |

### Date

| Rule                   | Description                            |
|------------------------|----------------------------------------|
| `date`                 | Valid date string                      |
| `datetime`             | Valid datetime string                  |
| `date_format:format`   | Must match a specific format           |
| `before:date`          | Must be before the given date          |
| `after:date`           | Must be after the given date           |
| `time`                 | Valid time string (`HH:MM` or `HH:MM:SS`) |
| `timezone`             | Valid timezone identifier              |

### Database

| Rule                     | Description                                    |
|--------------------------|------------------------------------------------|
| `exists:table,column`    | A record with this value must exist in the DB  |
| `unique:table,column`    | No record with this value may exist in the DB  |

### Conditional

| Rule                             | Description                                           |
|----------------------------------|-------------------------------------------------------|
| `required_if:field,value`        | Required when another field equals a value            |
| `required_unless:field,value`    | Required unless another field equals a value          |
| `required_with:field1,...`       | Required when any of the listed fields are present    |
| `required_without:field1,...`    | Required when any of the listed fields are absent     |

### File

| Rule            | Description                                      |
|-----------------|--------------------------------------------------|
| `mimes:jpg,png` | File MIME type must be one of the given types    |
| `size:n`        | File size in kilobytes must not exceed `n`       |

## Custom Rule Functions

```ts
import { validate, RuleFn } from '@lara-node/validator';

const isEven: RuleFn = (value, field) => {
  if (Number(value) % 2 !== 0) return `${field} must be an even number`;
  return null;
};

const data = await validate(body, { quantity: isEven });
```

## Conditional Rule Helpers

```ts
import { requiredIf, requiredUnless } from '@lara-node/validator';

const data = await validate(body, {
  company_name: requiredIf('type', 'business'),
  email:        requiredUnless('type', 'guest'),
});
```

## Nested Objects and Arrays

```ts
import { nestedRule, arrayOfObjectsRule } from '@lara-node/validator';

const data = await validate(body, {
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

## File Validation

```ts
import { fileRule, mimes, maxFileSize } from '@lara-node/validator';

const data = await validate({ file: req.file }, {
  file: [
    fileRule(),
    mimes(['image/jpeg', 'image/png', 'image/webp']),
    maxFileSize(5 * 1024 * 1024),   // 5 MB
  ],
});
```

## Custom Messages

Pass a third argument to `validate()` with dotted field-rule keys:

```ts
const data = await validate(body, rules, {
  'name.required': 'Please enter your full name.',
  'email.email':   'That does not look like a valid email.',
  'age.min':       'You must be at least 18 years old.',
});
```

## Express Integration

The `@lara-node/middlewares` package attaches `req.validate()` via `ValidatorMiddleware`. All rules and error handling work identically:

```ts
const data = await req.validate({
  email:    'required|email',
  password: 'required|string|min:8',
});
```

## Notes

- `exists` and `unique` rules perform live database queries via `@lara-node/db`. Do not use them outside of a context where the database is initialized.
- Rules are applied left-to-right. `nullable` stops processing when the field is null or undefined, so subsequent rules do not execute.
- `confirmed` looks for a `{field}_confirmation` key in the same input object. For a field named `password`, it expects `password_confirmation`.
