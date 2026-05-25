# @lara-node/validator

Laravel-inspired validation engine — built-in rules, async validation, typed error messages, and function-based rule factories.

## Installation

```sh
pnpm add @lara-node/validator
```

## Quick Start

```ts
import { validate, ValidationError } from "@lara-node/validator";

const data = await validate(req.body, {
  name:     "required|string|min:2|max:100",
  email:    "required|email|unique:users,email",
  password: "required|password|confirmed",
  age:      "required|integer|between:18,120",
  role:     "nullable|in:admin,user,moderator",
});
```

If validation fails a `ValidationError` is thrown. The `ErrorHandlerMiddleware` from `@lara-node/middlewares` catches it and returns HTTP 422 automatically.

---

## API

### `validate(data, rules, messages?)`

```ts
const result = await validate(
  req.body,
  { email: "required|email" },
  { "email.required": "Please enter your email address." },
);
```

Returns the validated (and type-cast) payload on success. Throws `ValidationError` on failure.

### `ValidationError`

```ts
try {
  await validate(body, rules);
} catch (err) {
  if (err instanceof ValidationError) {
    err.errors;   // { email: ["required"], name: ["min"] }
    err.messages; // { email: ["The email field is required."] }
    err.message;  // "The email field is required. and 1 more error(s)."
  }
}
```

### Rule formats

Rules can be written as a pipe-separated string, an array of strings, a `RuleFn`, or a `RuleSpec` object with per-rule custom messages:

```ts
// String
{ email: "required|email" }

// Array (joined internally)
{ email: ["required", "email"] }

// Function
{ quantity: (value) => Number(value) % 2 === 0 || { ok: false, message: "must be even" } }

// RuleSpec object — attach custom messages per rule
{
  email: {
    rule: "required|email|unique:users,email",
    messages: {
      required: "Email is required.",
      email:    "That doesn't look like a valid email.",
      unique:   "This email is already taken.",
    },
  },
}
```

---

## Built-in Rules

### Presence

| Rule | Description |
|---|---|
| `required` | Field must be present and non-empty |
| `nullable` | Field may be `null`/`undefined`; subsequent rules are skipped when absent |
| `sometimes` | Validate only when the field is present in the payload |
| `present` | Field key must exist (even if `null` or empty) |
| `filled` | If the field is present it must not be empty |
| `missing` | Field must be absent from the payload |
| `missing_if:field,value` | Must be absent when another field equals a value |
| `missing_unless:field,value` | Must be absent unless another field equals a value |
| `missing_with:f1,f2` | Must be absent when any of the given fields are present |
| `missing_with_all:f1,f2` | Must be absent when all of the given fields are present |
| `prohibited` | Field must be absent or empty |
| `prohibited_if:field,value` | Prohibited when another field equals a value |
| `prohibited_unless:field,value` | Prohibited unless another field equals a value |

### Type coercion

| Rule | Description |
|---|---|
| `string` | Coerces to string |
| `integer` | Must be (or parse to) an integer |
| `numeric` | Must be (or parse to) a number |
| `boolean` | Must be a boolean — also accepts `"true"/"false"`, `"1"/"0"`, `"yes"/"no"`, `"on"/"off"` |
| `array` | Must be an array (also tries to JSON-parse strings) |
| `list` | Array of scalar values only — no nested objects or arrays |
| `object` | Must be a plain object (not an array, not a primitive) |
| `json` | Must be valid JSON (string is parsed and the parsed value is returned) |

### String format

| Rule | Description |
|---|---|
| `email` | Valid email address |
| `url` | Valid URL (parsed by `new URL()`) |
| `uuid` | Valid UUID (v1–v5) |
| `ulid` | Valid ULID |
| `alpha` | Letters only (`a-z A-Z`) |
| `alpha_num` | Letters and numbers only |
| `alpha_dash` | Letters, numbers, `-`, `_` |
| `alpha_space` | Letters, numbers, and spaces |
| `slug` | Lowercase letters, numbers, and hyphens (`my-post-slug`) |
| `uppercase` | All characters must be uppercase |
| `lowercase` | All characters must be lowercase |
| `ascii` | Only ASCII characters (code points 0–127) |
| `hex` | Valid hexadecimal string |
| `hex_color` | Valid hex color (`#RGB` or `#RRGGBB`) |
| `ip` | Valid IPv4 or IPv6 address |
| `ipv4` | Valid IPv4 address |
| `ipv6` | Valid IPv6 address |
| `mac_address` | Valid MAC address (`AA:BB:CC:DD:EE:FF`) |
| `phone` | Valid international phone number |
| `credit_card` | Valid credit card number (Luhn algorithm) |
| `time` | Valid time string `HH:MM` or `HH:MM:SS` |
| `timezone` | Valid IANA timezone identifier |

### Size

| Rule | Applies to | Description |
|---|---|---|
| `min:n` | string, number, array | Min length / min value / min item count |
| `max:n` | string, number, array | Max length / max value / max item count |
| `between:n,m` | string, number, array | Length/value/count between `n` and `m` |
| `size:n` | string, number, array | Exact length / exact value / exact count |
| `digits:n` | string/number | Must be exactly `n` digits |
| `digits_between:n,m` | string/number | Digit count between `n` and `m` |
| `multiple_of:n` | number | Must be divisible by `n` |

### Comparison

| Rule | Description |
|---|---|
| `in:a,b,c` | Value must be one of the listed options |
| `not_in:a,b,c` | Value must not be one of the listed options |
| `same:field` | Must equal another field's value |
| `different:field` | Must differ from another field's value |
| `confirmed` | Must equal `{field}_confirmation` in the same payload |
| `accepted` | Must be truthy — `true`, `1`, `"1"`, `"yes"`, `"on"` |
| `declined` | Must be falsy — `false`, `0`, `"0"`, `"no"`, `"off"` |
| `gt:field` | Greater than another field (numeric or date) |
| `gte:field` | Greater than or equal to another field |
| `lt:field` | Less than another field |
| `lte:field` | Less than or equal to another field |

### Pattern

| Rule | Description |
|---|---|
| `regex:pattern` | Must match the given regex pattern |
| `not_regex:pattern` | Must NOT match the given regex pattern |
| `starts_with:a,b` | Must start with one of the given prefixes |
| `ends_with:a,b` | Must end with one of the given suffixes |
| `contains:str` | Must contain the given substring |

### Date

| Rule | Description |
|---|---|
| `date` | Valid date string or `Date` instance |
| `datetime` | Valid date-time string |
| `date_format:format` | Must match the given format (`YYYY-MM-DD`, `DD/MM/YYYY`, etc.) |
| `before:date\|field` | Must be before the given date or field value |
| `before_or_equal:date\|field` | Must be before or equal to the given date or field value |
| `after:date\|field` | Must be after the given date or field value |
| `after_or_equal:date\|field` | Must be after or equal to the given date or field value |
| `date_equals:date\|field` | Must be the same date as the given value or field |

Date comparison fields accept `"today"`, `"yesterday"`, `"tomorrow"`, and relative expressions like `"today+7days"`, `"today-1month"`.

### Conditional required

| Rule | Description |
|---|---|
| `required_if:field,value` | Required when another field equals a value |
| `required_unless:field,value` | Required unless another field equals a value |
| `required_with:f1,f2` | Required when any of the given fields are present |
| `required_with_all:f1,f2` | Required when all of the given fields are present |
| `required_without:f1,f2` | Required when any of the given fields are absent |
| `required_without_all:f1,f2` | Required when all of the given fields are absent |

### Array

| Rule | Description |
|---|---|
| `distinct` | All values in the array must be unique |
| `list` | Array of scalar values (strings, numbers, booleans) — no nested objects |

### Database

These rules issue live DB queries via `@lara-node/db`. Only use them after the database is initialized.

| Rule | Description |
|---|---|
| `exists:table,column` | A record with this value must exist |
| `unique:table,column` | No record with this value may exist |
| `unique:table,column,exceptValue` | Unique except for a specific value (useful on updates) |
| `unique:table,column,exceptColumn,exceptValue` | Unique except for a specific column/value pair |

### File

| Rule | Description |
|---|---|
| `mimes:jpg,png` | File extension must be in the allowed list |
| `max_file_size:n` | File size must not exceed `n` MB |

### Password

```ts
// Default: min 8 chars, must have uppercase + lowercase + number
{ password: "required|password" }

// Custom options (comma-separated)
{ password: "required|password:min:12,mixed,numbers,symbols" }
```

| Option | Description |
|---|---|
| `min:n` | Minimum character length (default 8) |
| `mixed` | Must have both uppercase and lowercase letters (default: on) |
| `numbers` | Must contain at least one digit (default: on) |
| `symbols` | Must contain at least one special character (default: off) |

---

## Function-Based Rule Factories

These are callable validators that return a `RuleFn`. Use them anywhere a rule string would be too limited.

### Presence

```ts
import { requiredIf, requiredUnless, prohibitedIf, prohibitedUnless,
         missingIf, missingUnless, filled, distinct } from "@lara-node/validator";

{ company_name: requiredIf("type", "business") }
{ personal_id:  requiredUnless("type", "company") }
{ ssn:          prohibitedIf("is_company", "true") }
{ ein:          prohibitedUnless("is_company", "true") }
{ nickname:     missingIf("anonymous", "true") }
{ bio:          missingUnless("show_profile", "true") }
{ description:  filled() }      // if present, must not be empty
{ tags:         distinct() }    // array — no duplicates
```

### String format

```ts
import { alpha, alphaNum, alphaDash, alphaSpace, slug,
         uppercase, lowercase, ascii, hexColor,
         ip, ipv4, ipv6, macAddress } from "@lara-node/validator";

{ name:    alpha() }
{ handle:  alphaNum() }
{ slug:    alphaDash() }
{ label:   alphaSpace() }
{ path:    slug() }
{ code:    uppercase() }
{ locale:  lowercase() }
{ token:   ascii() }
{ color:   hexColor() }
{ address: ip() }
{ v4addr:  ipv4() }
{ v6addr:  ipv6() }
{ device:  macAddress() }
```

### Pattern / numeric

```ts
import { regex, notRegex, digits, multipleOf,
         inList, notIn, ulidRule, uuidRule } from "@lara-node/validator";

{ sku:      regex(/^[A-Z]{3}-\d{4}$/) }
{ comment:  notRegex(/<script/i) }
{ zip:      digits(5) }
{ amount:   multipleOf(50) }
{ status:   inList("active", "inactive", "pending") }
{ state:    notIn("deleted", "banned") }
{ id:       ulidRule() }
{ uuid:     uuidRule(4) }   // UUID v4 only
```

### Size

```ts
import { minLength, maxLength, betweenLength } from "@lara-node/validator";

{ username: minLength(3) }
{ bio:      maxLength(500) }
{ pin:      betweenLength(4, 8) }
```

### Password

```ts
import { password } from "@lara-node/validator";

{
  password: password({ min: 12, mixed: true, numbers: true, symbols: true }),
}
```

### File

```ts
import { fileRule, mimes, maxFileSize } from "@lara-node/validator";

{
  avatar: [
    fileRule,
    mimes(["image/jpeg", "image/png", "image/webp"]),
    maxFileSize(5),   // 5 MB
  ],
}
```

### Other

```ts
import { phoneRule, creditCardRule } from "@lara-node/validator";

{ phone: phoneRule }
{ card:  creditCardRule }
```

---

## Custom Rule Function

A `RuleFn` receives `(value, field, payload)` and returns:
- `true` — passed
- `false` — failed with generic "invalid" message
- `{ ok: false, message: "code" }` — failed with a specific error code
- `{ ok: true, value: newValue }` — passed and replaces the field value

```ts
import { validate, RuleFn } from "@lara-node/validator";

const isEven: RuleFn = (value, field) => {
  if (Number(value) % 2 !== 0)
    return { ok: false, message: "must be an even number" };
  return true;
};

const data = await validate(body, { quantity: isEven });
```

Async rules work the same way:

```ts
const notDisposable: RuleFn = async (value) => {
  const blocked = await checkDisposableDomain(String(value));
  return blocked ? { ok: false, message: "disposable email not allowed" } : true;
};
```

---

## Nested Objects

```ts
import { nestedRule } from "@lara-node/validator";

const data = await validate(body, {
  address: nestedRule({
    street:  "required|string",
    city:    "required|string",
    country: "required|alpha|size:2|uppercase",
    zip:     "required|digits_between:4,10",
  }),
});
```

## Arrays of Objects

```ts
import { arrayOfObjectsRule } from "@lara-node/validator";

const data = await validate(body, {
  items: arrayOfObjectsRule({
    product_id: "required|integer|exists:products,id",
    quantity:   "required|integer|min:1",
    price:      "required|numeric|min:0",
  }),
});
```

## Wildcard Fields

```ts
// Validate every element of an array
const data = await validate(body, {
  "tags.*":         "string|max:50",
  "items.*.name":   "required|string",
  "items.*.amount": "required|numeric|min:0",
});
```

---

## Custom Messages

Pass a third argument to `validate()` with dotted `field.rule` keys:

```ts
const data = await validate(body, rules, {
  "name.required":          "Please enter your full name.",
  "email.email":            "That doesn't look like a valid email.",
  "password.password.min":  "Password must be at least 12 characters.",
  "password.confirmed":     "Passwords do not match.",
  "age.between":            "You must be between 18 and 120 years old.",
  "attributes.email":       "Email address",  // override field label in messages
});
```

Per-field messages can also be attached inline via the `RuleSpec` object format:

```ts
{
  email: {
    rule: "required|email|unique:users,email",
    messages: {
      required: "Email is required.",
      unique:   "This email address is already registered.",
    },
  },
}
```

---

## FormRequest integration

Use `FormRequest` from `@lara-node/core` to co-locate validation logic with your controller:

```ts
import { FormRequest } from "@lara-node/core";
import { password } from "@lara-node/validator";

class RegisterRequest extends FormRequest<{
  name: string;
  email: string;
  password: string;
}> {
  rules() {
    return {
      name:     "required|string|min:2|max:100",
      email:    "required|email|unique:users,email",
      password: ["required", password({ min: 8, symbols: true }), "confirmed"],
    };
  }

  messages() {
    return {
      "email.unique": "This email is already taken.",
    };
  }

  authorize(): boolean {
    return true;
  }
}

// Controller
async register(req: RegisterRequest, res: Response) {
  const { name, email, password } = req.validated();
  const user = await User.create({ name, email, password: await hash(password) });
  return res.status(201).json({ data: user });
}
```

---

## Notes

- Rules run left-to-right per field. `nullable` short-circuits when the value is absent.
- `exists` and `unique` dynamically import `@lara-node/db` on demand — safe to import the validator without a DB connection.
- `confirmed` checks for `{field}_confirmation` in the same payload.
- Date comparisons accept field names, literal dates, or keywords: `"today"`, `"yesterday"`, `"tomorrow"`, and relative forms like `"today+7days"`.
- `password` rule codes are namespaced: `password.min`, `password.mixed`, `password.numbers`, `password.symbols`.
