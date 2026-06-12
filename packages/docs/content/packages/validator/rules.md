# Validation Rules

LaraNode provides 50+ validation rules matching Laravel's API.

## String Rules

| Rule                | Description          |
| ------------------- | -------------------- |
| `string`            | Must be a string     |
| `max:N`             | Maximum length       |
| `min:N`             | Minimum length       |
| `size:N`            | Exact length         |
| `between:min,max`   | Length between range |
| `regex:pattern`     | Match regex pattern  |
| `starts_with:value` | Starts with value    |
| `ends_with:value`   | Ends with value      |
| `contains:value`    | Contains value       |

## Numeric Rules

| Rule              | Description           |
| ----------------- | --------------------- |
| `integer`         | Must be an integer    |
| `numeric`         | Must be a number      |
| `min:N`           | Minimum value         |
| `max:N`           | Maximum value         |
| `size:N`          | Exact value           |
| `between:min,max` | Value between range   |
| `gt:field`        | Greater than field    |
| `gte:field`       | Greater than or equal |
| `lt:field`        | Less than field       |
| `lte:field`       | Less than or equal    |

## Type Rules

| Rule        | Description                    |
| ----------- | ------------------------------ |
| `required`  | Must be present and not empty  |
| `nullable`  | Can be null                    |
| `sometimes` | Only validate if present       |
| `present`   | Must be present (can be empty) |
| `boolean`   | Must be boolean                |
| `array`     | Must be an array               |
| `json`      | Must be valid JSON             |

## Format Rules

| Rule                 | Description         |
| -------------------- | ------------------- |
| `email`              | Valid email address |
| `url`                | Valid URL           |
| `uuid`               | Valid UUID          |
| `phone`              | Valid phone number  |
| `credit_card`        | Valid credit card   |
| `date`               | Valid date          |
| `time`               | Valid time          |
| `datetime`           | Valid datetime      |
| `date_format:format` | Match date format   |
| `timezone`           | Valid timezone      |

## Date Comparison

| Rule                   | Description     |
| ---------------------- | --------------- |
| `before:date`          | Before date     |
| `before_or_equal:date` | Before or equal |
| `after:date`           | After date      |
| `after_or_equal:date`  | After or equal  |
| `date_equals:date`     | Equals date     |

## Value Rules

| Rule              | Description                   |
| ----------------- | ----------------------------- |
| `in:a,b,c`        | Must be in list               |
| `not_in:a,b,c`    | Must not be in list           |
| `same:field`      | Must match field              |
| `different:field` | Must differ from field        |
| `accepted`        | Must be yes/on/1/true         |
| `declined`        | Must be no/off/0/false        |
| `confirmed`       | Must match field_confirmation |

## Database Rules

| Rule                  | Description                |
| --------------------- | -------------------------- |
| `exists:table,column` | Must exist in database     |
| `unique:table,column` | Must be unique in database |

## Conditional Rules

| Rule                          | Description                        |
| ----------------------------- | ---------------------------------- |
| `required_if:field,value`     | Required if field equals value     |
| `required_unless:field,value` | Required unless field equals value |
| `required_with:fields`        | Required if any fields present     |
| `required_with_all:fields`    | Required if all fields present     |
| `required_without:fields`     | Required if any fields missing     |
| `required_without_all:fields` | Required if all fields missing     |

## File Rules

| Rule               | Description             |
| ------------------ | ----------------------- |
| `file`             | Must be a file          |
| `mimes:jpg,png`    | Allowed MIME types      |
| `max_file_size:mb` | Maximum file size in MB |

## Examples

```typescript
{
  name: 'required|string|max:255',
  email: 'required|email|unique:users,email',
  password: 'required|min:8|confirmed',
  age: 'required|integer|between:18,100',
  role: 'required|in:admin,user,moderator',
  website: 'nullable|url',
  birthday: 'required|date|before:2006-01-01',
  terms: 'required|accepted',
  tags: 'required|array',
  'tags.*': 'string|max:50',
}
```

## Next Steps

- [Basic Usage](/packages/validator/basic) -- Get started
- [Custom Rules](/packages/validator/custom-rules) -- Custom validation
- [Error Messages](/packages/validator/messages) -- Custom messages
