import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @lara-node/db so unique/exists rules don't need a real DB connection.
// The validator now loads @lara-node/db via createRequire (node:module) to
// avoid the ESM/CJS dual-package hazard, so we intercept at that level.
// ---------------------------------------------------------------------------
const { mockExists, mockWhere, MockModel } = vi.hoisted(() => {
  const mockExists = vi.fn();
  const mockWhere = vi.fn();

  class MockQueryBuilder {
    where(..._args: unknown[]) {
      mockWhere(..._args);
      return this;
    }
    async exists() {
      return mockExists();
    }
  }

  class MockModel {
    static table = "";
    static primaryKey = "id";
    static fillable: string[] = [];
    static query() {
      return new MockQueryBuilder();
    }
  }

  return { mockExists, mockWhere, MockModel };
});

vi.mock("node:module", () => ({
  createRequire: () => (id: string) => {
    if (id === "@lara-node/db") return { Model: MockModel };
    throw Object.assign(new Error(`Cannot find module '${id}'`), { code: "MODULE_NOT_FOUND" });
  },
}));

import {
  validate,
  ValidationError,
  formatMessage,
  resolveMessage,
  requiredIf,
  requiredUnless,
  prohibitedIf,
  prohibitedUnless,
  missingIf,
  missingUnless,
  filled,
  distinct,
  alpha,
  alphaNum,
  alphaDash,
  alphaSpace,
  ip,
  ipv4,
  ipv6,
  slug,
  uppercase,
  lowercase,
  ascii,
  digits,
  multipleOf,
  regex,
  notRegex,
  inList,
  notIn,
  ulidRule,
  uuidRule,
  minLength,
  maxLength,
  betweenLength,
  password,
  phoneRule,
  creditCardRule,
  nestedRule,
  arrayOfObjectsRule,
} from "../index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function expectError(err: unknown, field: string, code: string) {
  expect(err).toBeInstanceOf(ValidationError);
  const ve = err as ValidationError;
  expect(ve.errors[field]).toContain(code);
}

async function failsWith(
  payload: Record<string, unknown>,
  rules: Record<string, unknown>,
  field: string,
  code: string,
) {
  try {
    await validate(payload, rules as any);
    expect.fail("should have thrown ValidationError");
  } catch (e) {
    expectError(e, field, code);
  }
}

// ---------------------------------------------------------------------------
// ValidationError
// ---------------------------------------------------------------------------
describe("ValidationError", () => {
  it("stores errors and messages", () => {
    const err = new ValidationError(
      { email: ["unique"] },
      { email: ["email has already been taken."] },
    );
    expect(err.errors.email).toEqual(["unique"]);
    expect(err.messages.email).toEqual(["email has already been taken."]);
  });

  it("sets message to the first human-readable error when one error exists", () => {
    const err = new ValidationError(
      { email: ["required"] },
      { email: ["email field is required."] },
    );
    expect(err.message).toBe("email field is required.");
  });

  it("appends 'and N more error(s)' when multiple errors exist", () => {
    const err = new ValidationError(
      { email: ["required"], password: ["min"] },
      { email: ["email field is required."], password: ["password too short."] },
    );
    expect(err.message).toMatch(/and 1 more error/);
  });

  it("is an instance of Error", () => {
    const err = new ValidationError({}, {});
    expect(err).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// formatMessage / resolveMessage
// ---------------------------------------------------------------------------
describe("formatMessage", () => {
  it("replaces :placeholders with ctx values", () => {
    expect(formatMessage(":attribute must be at least :min characters.", { attribute: "name", min: 3 })).toBe(
      "name must be at least 3 characters.",
    );
  });

  it("leaves unknown placeholders intact", () => {
    expect(formatMessage(":attribute is :unknown.", { attribute: "email" })).toBe(
      "email is :unknown.",
    );
  });
});

describe("resolveMessage", () => {
  it("returns default message for a known code", () => {
    const msg = resolveMessage("email", "unique", {});
    expect(msg).toBe("email has already been taken.");
  });

  it("substitutes custom field-level messages", () => {
    const msg = resolveMessage("email", "required", {}, { "email.required": "Please enter your email." });
    expect(msg).toBe("Please enter your email.");
  });

  it("uses variant code for min.string", () => {
    const msg = resolveMessage("name", "min", { min: 3, kind: "string" });
    expect(msg).toBe("name must be at least 3 characters.");
  });

  it("uses variant code for min.numeric", () => {
    const msg = resolveMessage("age", "min", { min: 18, kind: "numeric" });
    expect(msg).toBe("age must be at least 18.");
  });

  it("uses custom attribute label when provided", () => {
    const msg = resolveMessage("first_name", "required", {}, { "attributes.first_name": "First Name" });
    expect(msg).toBe("First Name field is required.");
  });
});

// ---------------------------------------------------------------------------
// required
// ---------------------------------------------------------------------------
describe("required rule", () => {
  it("passes when value is present", async () => {
    const result = await validate({ name: "Alice" }, { name: "required" });
    expect(result.name).toBe("Alice");
  });

  it("fails with 'required' when field is missing", async () => {
    await failsWith({}, { name: "required" }, "name", "required");
  });

  it("fails when field is null", async () => {
    await failsWith({ name: null }, { name: "required" }, "name", "required");
  });

  it("fails when field is empty string", async () => {
    await failsWith({ name: "" }, { name: "required" }, "name", "required");
  });
});

// ---------------------------------------------------------------------------
// nullable
// ---------------------------------------------------------------------------
describe("nullable rule", () => {
  it("skips other rules when value is null", async () => {
    const result = await validate({ age: null }, { age: "nullable|integer" });
    expect(result.age).toBeNull();
  });

  it("skips other rules when value is empty string", async () => {
    const result = await validate({ tag: "" }, { tag: "nullable|string" });
    expect(result.tag).toBe("");
  });

  it("still validates when value is present", async () => {
    await failsWith({ age: "abc" }, { age: "nullable|integer" }, "age", "integer");
  });
});

// ---------------------------------------------------------------------------
// sometimes
// ---------------------------------------------------------------------------
describe("sometimes rule", () => {
  it("skips validation when field is absent", async () => {
    const result = await validate({}, { phone: "sometimes|string|min:10" });
    expect((result as any).phone).toBeUndefined();
  });

  it("validates when field is present", async () => {
    await failsWith({ phone: "hi" }, { phone: "sometimes|string|min:10" }, "phone", "min");
  });
});

// ---------------------------------------------------------------------------
// email
// ---------------------------------------------------------------------------
describe("email rule", () => {
  it("passes for a valid email", async () => {
    const r = await validate({ email: "user@example.com" }, { email: "required|email" });
    expect(r.email).toBe("user@example.com");
  });

  it("fails for a missing @ sign", async () => {
    await failsWith({ email: "userexample.com" }, { email: "required|email" }, "email", "email");
  });

  it("fails for a missing domain", async () => {
    await failsWith({ email: "user@" }, { email: "required|email" }, "email", "email");
  });

  it("fails for an email with spaces", async () => {
    await failsWith({ email: "user @example.com" }, { email: "required|email" }, "email", "email");
  });
});

// ---------------------------------------------------------------------------
// unique rule (requires mocked DB)
// ---------------------------------------------------------------------------
describe("unique rule", () => {
  beforeEach(() => {
    mockExists.mockReset();
    mockWhere.mockReset();
  });

  it("fails with 'unique' error code when email already exists", async () => {
    mockExists.mockResolvedValue(true);

    try {
      await validate(
        { email: "existing@example.com" },
        { email: "required|email|unique:users,email" },
      );
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      const ve = e as ValidationError;
      expect(ve.errors.email).toContain("unique");
      expect(ve.messages.email[0]).toBe("email has already been taken.");
      expect(ve.message).toBe("email has already been taken.");
    }
  });

  it("produces the exact response shape for a duplicate email registration", async () => {
    mockExists.mockResolvedValue(true);

    try {
      await validate(
        { email: "taken@example.com" },
        { email: "required|email|unique:users,email" },
      );
    } catch (e) {
      const ve = e as ValidationError;
      const response = {
        success: false,
        errors: ve.errors,
        messages: ve.messages,
        message: ve.message,
      };
      expect(response).toEqual({
        success: false,
        errors: { email: ["unique"] },
        messages: { email: ["email has already been taken."] },
        message: "email has already been taken.",
      });
    }
  });

  it("passes when email does not exist in the database", async () => {
    mockExists.mockResolvedValue(false);

    const result = await validate(
      { email: "new@example.com" },
      { email: "required|email|unique:users,email" },
    );
    expect(result.email).toBe("new@example.com");
  });

  it("defaults to 'id' column when only table is given", async () => {
    mockExists.mockResolvedValue(false);
    const result = await validate({ id: 42 }, { id: "required|unique:users" });
    expect(result.id).toBe(42);
  });

  it("supports ignore (except) clause to allow updates", async () => {
    // Simulate the query returning true for existence, but the except clause
    // would filter it out — the mock returns false (record excluded by except)
    mockExists.mockResolvedValue(false);

    const result = await validate(
      { email: "user@example.com" },
      { email: "required|email|unique:users,email,5" },
    );
    expect(result.email).toBe("user@example.com");
  });
});

// ---------------------------------------------------------------------------
// integer
// ---------------------------------------------------------------------------
describe("integer rule", () => {
  it("coerces a string integer", async () => {
    const r = await validate({ count: "42" }, { count: "integer" });
    expect(r.count).toBe(42);
  });

  it("fails for a non-integer string", async () => {
    await failsWith({ count: "abc" }, { count: "integer" }, "count", "integer");
  });
});

// ---------------------------------------------------------------------------
// numeric
// ---------------------------------------------------------------------------
describe("numeric rule", () => {
  it("coerces a numeric string to number", async () => {
    const r = await validate({ price: "3.14" }, { price: "numeric" });
    expect(r.price).toBe(3.14);
  });

  it("fails for a non-numeric string", async () => {
    await failsWith({ price: "abc" }, { price: "numeric" }, "price", "numeric");
  });
});

// ---------------------------------------------------------------------------
// boolean
// ---------------------------------------------------------------------------
describe("boolean rule", () => {
  it("coerces 'true' to true", async () => {
    const r = await validate({ active: "true" }, { active: "boolean" });
    expect(r.active).toBe(true);
  });

  it("coerces '0' to false", async () => {
    const r = await validate({ active: "0" }, { active: "boolean" });
    expect(r.active).toBe(false);
  });

  it("fails for a non-boolean string", async () => {
    await failsWith({ active: "maybe" }, { active: "boolean" }, "active", "boolean");
  });
});

// ---------------------------------------------------------------------------
// array
// ---------------------------------------------------------------------------
describe("array rule", () => {
  it("passes for an actual array", async () => {
    const r = await validate({ tags: ["a", "b"] }, { tags: "array" });
    expect(r.tags).toEqual(["a", "b"]);
  });

  it("parses a JSON-encoded array string", async () => {
    const r = await validate({ tags: '["a","b"]' }, { tags: "array" });
    expect(r.tags).toEqual(["a", "b"]);
  });

  it("fails for a plain string", async () => {
    await failsWith({ tags: "not-an-array" }, { tags: "array" }, "tags", "array");
  });
});

// ---------------------------------------------------------------------------
// json
// ---------------------------------------------------------------------------
describe("json rule", () => {
  it("parses a valid JSON string", async () => {
    const r = await validate({ meta: '{"key":"value"}' }, { meta: "json" });
    expect(r.meta).toEqual({ key: "value" });
  });

  it("fails for invalid JSON", async () => {
    await failsWith({ meta: "{bad}" }, { meta: "json" }, "meta", "json");
  });
});

// ---------------------------------------------------------------------------
// url
// ---------------------------------------------------------------------------
describe("url rule", () => {
  it("passes for a valid https URL", async () => {
    const r = await validate({ link: "https://example.com" }, { link: "url" });
    expect(r.link).toBe("https://example.com");
  });

  it("fails for a bare hostname", async () => {
    await failsWith({ link: "example.com" }, { link: "url" }, "link", "url");
  });
});

// ---------------------------------------------------------------------------
// uuid
// ---------------------------------------------------------------------------
describe("uuid rule", () => {
  it("passes for a valid UUID v4", async () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const r = await validate({ id }, { id: "uuid" });
    expect(r.id).toBe(id);
  });

  it("fails for a malformed UUID", async () => {
    await failsWith({ id: "not-a-uuid" }, { id: "uuid" }, "id", "uuid");
  });
});

// ---------------------------------------------------------------------------
// min / max / size / between
// ---------------------------------------------------------------------------
describe("min rule", () => {
  it("passes when string length meets minimum", async () => {
    const r = await validate({ name: "Alice" }, { name: "string|min:3" });
    expect(r.name).toBe("Alice");
  });

  it("fails when string is too short", async () => {
    await failsWith({ name: "Al" }, { name: "string|min:3" }, "name", "min");
  });

  it("passes for numeric value meeting minimum", async () => {
    const r = await validate({ age: 18 }, { age: "numeric|min:18" });
    expect(r.age).toBe(18);
  });

  it("fails when numeric value is below minimum", async () => {
    await failsWith({ age: 17 }, { age: "numeric|min:18" }, "age", "min");
  });
});

describe("max rule", () => {
  it("passes when string length is within max", async () => {
    const r = await validate({ bio: "Hello" }, { bio: "string|max:191" });
    expect(r.bio).toBe("Hello");
  });

  it("fails when string exceeds max length", async () => {
    await failsWith({ bio: "A".repeat(192) }, { bio: "string|max:191" }, "bio", "max");
  });
});

describe("between rule", () => {
  it("passes for numeric value in range", async () => {
    const r = await validate({ score: 50 }, { score: "numeric|between:1,100" });
    expect(r.score).toBe(50);
  });

  it("fails for numeric value out of range", async () => {
    await failsWith({ score: 101 }, { score: "numeric|between:1,100" }, "score", "between");
  });
});

describe("size rule", () => {
  it("passes when string has exact length", async () => {
    const r = await validate({ code: "ABC" }, { code: "string|size:3" });
    expect(r.code).toBe("ABC");
  });

  it("fails when string length differs from size", async () => {
    await failsWith({ code: "ABCD" }, { code: "string|size:3" }, "code", "size");
  });
});

// ---------------------------------------------------------------------------
// in / not_in
// ---------------------------------------------------------------------------
describe("in rule", () => {
  it("passes when value is in the list", async () => {
    const r = await validate({ role: "admin" }, { role: "in:admin,user,editor" });
    expect(r.role).toBe("admin");
  });

  it("fails when value is not in the list", async () => {
    await failsWith({ role: "superuser" }, { role: "in:admin,user,editor" }, "role", "in");
  });
});

describe("not_in rule", () => {
  it("passes when value is not in the forbidden list", async () => {
    const r = await validate({ status: "active" }, { status: "not_in:deleted,banned" });
    expect(r.status).toBe("active");
  });

  it("fails when value is in the forbidden list", async () => {
    await failsWith({ status: "banned" }, { status: "not_in:deleted,banned" }, "status", "not_in");
  });
});

// ---------------------------------------------------------------------------
// regex / not_regex
// ---------------------------------------------------------------------------
describe("regex rule", () => {
  it("passes when value matches the pattern", async () => {
    const r = await validate({ code: "ABC-123" }, { code: "regex:^[A-Z]+-\\d+$" });
    expect(r.code).toBe("ABC-123");
  });

  it("fails when value does not match the pattern", async () => {
    await failsWith({ code: "abc-123" }, { code: "regex:^[A-Z]+-\\d+$" }, "code", "regex");
  });
});

describe("not_regex rule", () => {
  it("fails when value matches the forbidden pattern", async () => {
    await failsWith({ name: "<script>" }, { name: "not_regex:<script>" }, "name", "not_regex");
  });

  it("passes when value does not match the forbidden pattern", async () => {
    const r = await validate({ name: "John" }, { name: "not_regex:<script>" });
    expect(r.name).toBe("John");
  });
});

// ---------------------------------------------------------------------------
// confirmed
// ---------------------------------------------------------------------------
describe("confirmed rule", () => {
  it("passes when confirmation field matches", async () => {
    const payload = { password: "secret123", password_confirmation: "secret123" };
    const r = await validate(payload, { password: "required|string|confirmed" });
    expect(r.password).toBe("secret123");
  });

  it("fails when confirmation field is different", async () => {
    const payload = { password: "secret123", password_confirmation: "different" };
    await failsWith(payload, { password: "required|string|confirmed" }, "password", "confirmed");
  });
});

// ---------------------------------------------------------------------------
// same / different
// ---------------------------------------------------------------------------
describe("same rule", () => {
  it("passes when both fields are identical", async () => {
    const r = await validate({ a: "x", b: "x" }, { a: "same:b" });
    expect(r.a).toBe("x");
  });

  it("fails when fields are not identical", async () => {
    await failsWith({ a: "x", b: "y" }, { a: "same:b" }, "a", "same");
  });
});

describe("different rule", () => {
  it("passes when fields differ", async () => {
    const r = await validate({ old_pass: "old", new_pass: "new" }, { new_pass: "different:old_pass" });
    expect(r.new_pass).toBe("new");
  });

  it("fails when fields are the same", async () => {
    await failsWith({ old_pass: "same", new_pass: "same" }, { new_pass: "different:old_pass" }, "new_pass", "different");
  });
});

// ---------------------------------------------------------------------------
// starts_with / ends_with / contains
// ---------------------------------------------------------------------------
describe("starts_with rule", () => {
  it("passes when value starts with one of the prefixes", async () => {
    const r = await validate({ url: "https://example.com" }, { url: "starts_with:http,https" });
    expect(r.url).toBe("https://example.com");
  });

  it("fails when value does not start with any prefix", async () => {
    await failsWith({ url: "ftp://example.com" }, { url: "starts_with:http,https" }, "url", "starts_with");
  });
});

describe("ends_with rule", () => {
  it("passes when value ends with one of the suffixes", async () => {
    const r = await validate({ file: "photo.jpg" }, { file: "ends_with:.jpg,.png" });
    expect(r.file).toBe("photo.jpg");
  });

  it("fails when value does not end with any suffix", async () => {
    await failsWith({ file: "photo.gif" }, { file: "ends_with:.jpg,.png" }, "file", "ends_with");
  });
});

describe("contains rule", () => {
  it("passes when value contains the substring", async () => {
    const r = await validate({ bio: "I love Node.js" }, { bio: "contains:Node" });
    expect(r.bio).toBe("I love Node.js");
  });

  it("fails when value does not contain the substring", async () => {
    await failsWith({ bio: "I love Python" }, { bio: "contains:Node" }, "bio", "contains");
  });
});

// ---------------------------------------------------------------------------
// accepted / declined
// ---------------------------------------------------------------------------
describe("accepted rule", () => {
  it("passes for 'yes'", async () => {
    const r = await validate({ terms: "yes" }, { terms: "accepted" });
    expect(r.terms).toBe("yes");
  });

  it("passes for true", async () => {
    const r = await validate({ terms: true }, { terms: "accepted" });
    expect(r.terms).toBe(true);
  });

  it("fails for 'no'", async () => {
    await failsWith({ terms: "no" }, { terms: "accepted" }, "terms", "accepted");
  });
});

describe("declined rule", () => {
  it("passes for 'no'", async () => {
    const r = await validate({ marketing: "no" }, { marketing: "declined" });
    expect(r.marketing).toBe("no");
  });

  it("fails for 'yes'", async () => {
    await failsWith({ marketing: "yes" }, { marketing: "declined" }, "marketing", "declined");
  });
});

// ---------------------------------------------------------------------------
// present
// ---------------------------------------------------------------------------
describe("present rule", () => {
  it("passes when field exists (even if null)", async () => {
    const r = await validate({ meta: null }, { meta: "present" });
    expect(r.meta).toBeNull();
  });

  it("fails when field is completely absent", async () => {
    await failsWith({}, { meta: "present" }, "meta", "present");
  });
});

// ---------------------------------------------------------------------------
// filled
// ---------------------------------------------------------------------------
describe("filled rule", () => {
  it("passes when field is present with a non-empty value", async () => {
    const r = await validate({ code: "ABC" }, { code: "filled" });
    expect(r.code).toBe("ABC");
  });

  it("fails when field is present but empty", async () => {
    await failsWith({ code: "" }, { code: "filled" }, "code", "filled");
  });

  it("skips when field is absent entirely", async () => {
    const r = await validate({}, { code: "filled" });
    expect((r as any).code).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// missing
// ---------------------------------------------------------------------------
describe("missing rule", () => {
  it("passes when field is absent", async () => {
    const r = await validate({}, { secret: "missing" });
    expect((r as any).secret).toBeUndefined();
  });

  it("fails when field is present", async () => {
    await failsWith({ secret: "oops" }, { secret: "missing" }, "secret", "missing");
  });
});

// ---------------------------------------------------------------------------
// prohibited
// ---------------------------------------------------------------------------
describe("prohibited rule", () => {
  it("passes when field is absent", async () => {
    const r = await validate({}, { admin: "prohibited" });
    expect((r as any).admin).toBeUndefined();
  });

  it("fails when field is present", async () => {
    await failsWith({ admin: true }, { admin: "prohibited" }, "admin", "prohibited");
  });
});

// ---------------------------------------------------------------------------
// required_if / required_unless / required_with / required_without
// ---------------------------------------------------------------------------
describe("conditional required rules", () => {
  it("required_if: requires field when condition matches", async () => {
    await failsWith(
      { type: "business" },
      { type: "string", company: "required_if:type,business" },
      "company",
      "required",
    );
  });

  it("required_if: skips when condition does not match", async () => {
    const r = await validate(
      { type: "personal" },
      { type: "string", company: "required_if:type,business" },
    );
    expect((r as any).company).toBeUndefined();
  });

  it("required_unless: requires field when condition does not match", async () => {
    await failsWith(
      { role: "user" },
      { role: "string", org_id: "required_unless:role,admin" },
      "org_id",
      "required",
    );
  });

  it("required_with: requires field when another field is present", async () => {
    await failsWith(
      { address: "123 Main St" },
      { address: "string", city: "required_with:address" },
      "city",
      "required",
    );
  });

  it("required_without: requires field when another field is absent", async () => {
    await failsWith(
      {},
      { phone: "required_without:email", email: "sometimes|email" },
      "phone",
      "required",
    );
  });
});

// ---------------------------------------------------------------------------
// prohibited_if / prohibited_unless
// ---------------------------------------------------------------------------
describe("prohibited_if / prohibited_unless rules", () => {
  it("prohibited_if: fails when condition matches and field is present", async () => {
    await failsWith(
      { role: "guest", admin_only: "sensitive" },
      { role: "string", admin_only: "prohibited_if:role,guest" },
      "admin_only",
      "prohibited_if",
    );
  });

  it("prohibited_unless: fails when condition does not match and field is present", async () => {
    await failsWith(
      { role: "user", secret: "value" },
      { role: "string", secret: "prohibited_unless:role,admin" },
      "secret",
      "prohibited_unless",
    );
  });
});

// ---------------------------------------------------------------------------
// missing_if / missing_unless
// ---------------------------------------------------------------------------
describe("missing_if / missing_unless rules", () => {
  it("missing_if: fails when field should be absent but is present", async () => {
    await failsWith(
      { status: "inactive", activated_at: "2024-01-01" },
      { status: "string", activated_at: "missing_if:status,inactive" },
      "activated_at",
      "missing_if",
    );
  });
});

// ---------------------------------------------------------------------------
// gt / gte / lt / lte
// ---------------------------------------------------------------------------
describe("comparison rules", () => {
  it("gt: passes when value is greater", async () => {
    const r = await validate({ high: 10, low: 5 }, { high: "numeric|gt:low" });
    expect(r.high).toBe(10);
  });

  it("gt: fails when value is not greater", async () => {
    await failsWith({ high: 5, low: 5 }, { high: "numeric|gt:low" }, "high", "gt");
  });

  it("gte: passes when value is equal", async () => {
    const r = await validate({ a: 5, b: 5 }, { a: "numeric|gte:b" });
    expect(r.a).toBe(5);
  });

  it("lt: passes when value is less", async () => {
    const r = await validate({ min: 1, max: 10 }, { min: "numeric|lt:max" });
    expect(r.min).toBe(1);
  });

  it("lte: fails when value exceeds the other field", async () => {
    await failsWith({ a: 10, b: 5 }, { a: "numeric|lte:b" }, "a", "lte");
  });
});

// ---------------------------------------------------------------------------
// date comparison rules
// ---------------------------------------------------------------------------
describe("date comparison rules", () => {
  it("before: passes when date is earlier than the reference date", async () => {
    const r = await validate(
      { start: "2020-01-01", end: "2020-12-31" },
      { start: "date|before:end" },
    );
    expect(r.start).toBeInstanceOf(Date);
  });

  it("before: fails when date is after the reference date", async () => {
    await failsWith(
      { start: "2021-01-01", end: "2020-01-01" },
      { start: "date|before:end" },
      "start",
      "before",
    );
  });

  it("after: passes when date is later than the reference date", async () => {
    const r = await validate(
      { end: "2021-01-01", start: "2020-01-01" },
      { end: "date|after:start" },
    );
    expect(r.end).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// password rule
// ---------------------------------------------------------------------------
describe("password rule (string-based)", () => {
  it("passes for a strong password", async () => {
    const r = await validate({ password: "Secret123" }, { password: "required|password:min:8,mixed,numbers" });
    expect(r.password).toBe("Secret123");
  });

  it("fails when password is too short", async () => {
    await failsWith({ password: "Ab1" }, { password: "password:min:8" }, "password", "password.min");
  });

  it("fails when mixed case is required but missing", async () => {
    await failsWith({ password: "alllowercase1" }, { password: "password:mixed,numbers" }, "password", "password.mixed");
  });

  it("fails when numbers are required but missing", async () => {
    await failsWith({ password: "AllUppercaseOnly" }, { password: "password:mixed,numbers" }, "password", "password.numbers");
  });
});

// ---------------------------------------------------------------------------
// alpha / alpha_num / alpha_dash / alpha_space
// ---------------------------------------------------------------------------
describe("alpha rules", () => {
  it("alpha: passes for letters only", async () => {
    const r = await validate({ name: "Alice" }, { name: "alpha" });
    expect(r.name).toBe("Alice");
  });

  it("alpha: fails when digits are present", async () => {
    await failsWith({ name: "Alice123" }, { name: "alpha" }, "name", "alpha");
  });

  it("alpha_num: passes for letters and numbers", async () => {
    const r = await validate({ code: "ABC123" }, { code: "alpha_num" });
    expect(r.code).toBe("ABC123");
  });

  it("alpha_num: fails with special chars", async () => {
    await failsWith({ code: "ABC-123" }, { code: "alpha_num" }, "code", "alpha_num");
  });

  it("alpha_dash: passes for letters, numbers, dashes and underscores", async () => {
    const r = await validate({ slug2: "my-slug_1" }, { slug2: "alpha_dash" });
    expect(r.slug2).toBe("my-slug_1");
  });

  it("alpha_space: passes for letters, numbers and spaces", async () => {
    const r = await validate({ title: "Hello World 123" }, { title: "alpha_space" });
    expect(r.title).toBe("Hello World 123");
  });
});

// ---------------------------------------------------------------------------
// slug / uppercase / lowercase / ascii
// ---------------------------------------------------------------------------
describe("format rules", () => {
  it("slug: passes for a valid slug", async () => {
    const r = await validate({ handle: "my-cool-post" }, { handle: "slug" });
    expect(r.handle).toBe("my-cool-post");
  });

  it("slug: fails for uppercase characters", async () => {
    await failsWith({ handle: "My-Post" }, { handle: "slug" }, "handle", "slug");
  });

  it("uppercase: passes when all letters are uppercase", async () => {
    const r = await validate({ code: "ABC" }, { code: "uppercase" });
    expect(r.code).toBe("ABC");
  });

  it("lowercase: passes when all letters are lowercase", async () => {
    const r = await validate({ code: "abc" }, { code: "lowercase" });
    expect(r.code).toBe("abc");
  });

  it("ascii: passes for ASCII-only string", async () => {
    const r = await validate({ text: "Hello World!" }, { text: "ascii" });
    expect(r.text).toBe("Hello World!");
  });

  it("ascii: fails for non-ASCII characters", async () => {
    await failsWith({ text: "Héllo" }, { text: "ascii" }, "text", "ascii");
  });
});

// ---------------------------------------------------------------------------
// ip / ipv4 / ipv6
// ---------------------------------------------------------------------------
describe("IP address rules", () => {
  it("ipv4: passes for a valid IPv4 address", async () => {
    const r = await validate({ addr: "192.168.1.1" }, { addr: "ipv4" });
    expect(r.addr).toBe("192.168.1.1");
  });

  it("ipv4: fails for an invalid IPv4 address", async () => {
    await failsWith({ addr: "999.999.999.999" }, { addr: "ipv4" }, "addr", "ipv4");
  });

  it("ipv6: passes for a valid IPv6 address", async () => {
    const r = await validate({ addr: "::1" }, { addr: "ipv6" });
    expect(r.addr).toBe("::1");
  });

  it("ip: passes for an IPv4 address", async () => {
    const r = await validate({ addr: "10.0.0.1" }, { addr: "ip" });
    expect(r.addr).toBe("10.0.0.1");
  });
});

// ---------------------------------------------------------------------------
// digits / digits_between / multiple_of
// ---------------------------------------------------------------------------
describe("digit rules", () => {
  it("digits: passes for exact digit count", async () => {
    const r = await validate({ pin: "1234" }, { pin: "digits:4" });
    expect(r.pin).toBe("1234");
  });

  it("digits: fails for wrong digit count", async () => {
    await failsWith({ pin: "123" }, { pin: "digits:4" }, "pin", "digits");
  });

  it("multiple_of: passes when value is divisible", async () => {
    const r = await validate({ qty: 12 }, { qty: "numeric|multiple_of:4" });
    expect(r.qty).toBe(12);
  });

  it("multiple_of: fails when value is not divisible", async () => {
    await failsWith({ qty: 13 }, { qty: "numeric|multiple_of:4" }, "qty", "multiple_of");
  });
});

// ---------------------------------------------------------------------------
// distinct
// ---------------------------------------------------------------------------
describe("distinct rule", () => {
  it("passes when array has no duplicates", async () => {
    const r = await validate({ ids: [1, 2, 3] }, { ids: "array|distinct" });
    expect(r.ids).toEqual([1, 2, 3]);
  });

  it("fails when array has duplicate values", async () => {
    await failsWith({ ids: [1, 2, 2] }, { ids: "array|distinct" }, "ids", "distinct");
  });
});

// ---------------------------------------------------------------------------
// Custom messages
// ---------------------------------------------------------------------------
describe("custom messages", () => {
  it("uses a field-level custom message for required", async () => {
    try {
      await validate({}, { email: "required" }, { "email.required": "Please provide your email." });
    } catch (e) {
      const ve = e as ValidationError;
      expect(ve.messages.email[0]).toBe("Please provide your email.");
    }
  });

  it("uses a global custom message for a rule code", async () => {
    try {
      await validate({ email: "not-valid" }, { email: "required|email" }, { email: "Enter a valid email." });
    } catch (e) {
      const ve = e as ValidationError;
      expect(ve.messages.email[0]).toBe("Enter a valid email.");
    }
  });
});

// ---------------------------------------------------------------------------
// Function-based rules (RuleFn)
// ---------------------------------------------------------------------------
describe("function-based rules (RuleFn)", () => {
  it("passes when custom rule returns true", async () => {
    const isEven = (val: unknown) => (Number(val) % 2 === 0 ? true : false);
    const r = await validate({ count: 4 }, { count: isEven });
    expect(r.count).toBe(4);
  });

  it("fails when custom rule returns false", async () => {
    const isEven = (val: unknown) => (Number(val) % 2 === 0 ? true : false);
    await failsWith({ count: 3 }, { count: isEven }, "count", "invalid");
  });

  it("supports returning { ok: false, message } for a named error code", async () => {
    const noSpecialChars = (val: unknown) =>
      /^[a-zA-Z0-9 ]+$/.test(String(val)) ? true : { ok: false as const, message: "no_special_chars" };

    try {
      await validate({ name: "John<>" }, { name: noSpecialChars });
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      const ve = e as ValidationError;
      expect(ve.errors.name).toContain("no_special_chars");
    }
  });

  it("supports returning { ok: true, value } to transform the value", async () => {
    const trimmer = (val: unknown) => ({ ok: true as const, value: String(val).trim() });
    const r = await validate({ name: "  Alice  " }, { name: trimmer });
    expect(r.name).toBe("Alice");
  });
});

// ---------------------------------------------------------------------------
// Wildcard (nested array) rules
// ---------------------------------------------------------------------------
describe("wildcard array rules", () => {
  it("validates each item in an array field", async () => {
    const r = await validate(
      { tags: ["alpha", "beta"] },
      { "tags.*": "string|min:3" },
    );
    expect((r as any).tags).toEqual(["alpha", "beta"]);
  });

  it("fails when any array item violates the rule", async () => {
    await failsWith(
      { tags: ["alpha", "ab"] },
      { "tags.*": "string|min:3" },
      "tags.1",
      "min",
    );
  });

  it("validates a nested key inside each array item (middle wildcard)", async () => {
    const r = await validate(
      { fields: [{ key: "a" }, { key: "b" }] },
      { fields: "required|array", "fields.*.key": "required|string|max:64" },
    );
    expect((r as any).fields).toEqual([{ key: "a" }, { key: "b" }]);
  });

  it("fails when a nested key inside an array item is missing", async () => {
    await failsWith(
      { fields: [{ key: "a" }, { label: "no key" }] },
      { fields: "required|array", "fields.*.key": "required|string" },
      "fields.1.key",
      "required",
    );
  });
});

// ---------------------------------------------------------------------------
// nestedRule / arrayOfObjectsRule factory helpers
// ---------------------------------------------------------------------------
describe("nestedRule", () => {
  it("passes when nested object satisfies its rules", async () => {
    const r = await validate(
      { address: { city: "Nairobi", country: "KE" } },
      { address: nestedRule({ city: "required|string", country: "required|string" }) },
    );
    expect((r.address as any).city).toBe("Nairobi");
  });

  it("fails when nested object violates a rule", async () => {
    await failsWith(
      { address: { country: "KE" } },
      { address: nestedRule({ city: "required|string", country: "required|string" }) },
      "address",
      "nested_validation_failed",
    );
  });
});

describe("arrayOfObjectsRule", () => {
  it("passes for a valid array of objects", async () => {
    const r = await validate(
      { items: [{ name: "Alice" }, { name: "Bob" }] },
      { items: arrayOfObjectsRule({ name: "required|string" }) },
    );
    expect(r.items).toHaveLength(2);
  });

  it("fails when an item in the array is invalid", async () => {
    await failsWith(
      { items: [{ name: "Alice" }, {}] },
      { items: arrayOfObjectsRule({ name: "required|string" }) },
      "items",
      "items[1].validation_failed",
    );
  });
});

// ---------------------------------------------------------------------------
// requiredIf / requiredUnless factory helpers
// ---------------------------------------------------------------------------
describe("requiredIf factory", () => {
  it("makes field required when condition matches", async () => {
    try {
      await validate(
        { type: "business" },
        { type: "string", company: requiredIf("type", "business") },
      );
      expect.fail("should have thrown");
    } catch (e) {
      const ve = e as ValidationError;
      expect(ve.errors.company[0]).toBe("required");
    }
  });

  it("skips when condition does not match", async () => {
    const r = await validate(
      { type: "personal" },
      { type: "string", company: requiredIf("type", "business") },
    );
    expect((r as any).company).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// password factory helper
// ---------------------------------------------------------------------------
describe("password factory helper", () => {
  it("passes for a strong password with symbols", async () => {
    const r = await validate(
      { pwd: "Secure@123" },
      { pwd: password({ min: 8, mixed: true, numbers: true, symbols: true }) },
    );
    expect(r.pwd).toBe("Secure@123");
  });

  it("fails when symbols are required but missing", async () => {
    try {
      await validate(
        { pwd: "SecureAbc123" },
        { pwd: password({ min: 8, mixed: true, numbers: true, symbols: true }) },
      );
      expect.fail("should have thrown");
    } catch (e) {
      const ve = e as ValidationError;
      expect(ve.errors.pwd[0]).toBe("password.symbols");
    }
  });
});

// ---------------------------------------------------------------------------
// phoneRule / creditCardRule factory helpers
// ---------------------------------------------------------------------------
describe("phoneRule", () => {
  it("passes for a valid international phone number", async () => {
    const r = await validate({ phone: "+254712345678" }, { phone: phoneRule });
    expect(r.phone).toBe("+254712345678");
  });

  it("fails for a clearly invalid phone number", async () => {
    try {
      await validate({ phone: "123" }, { phone: phoneRule });
    } catch (e) {
      const ve = e as ValidationError;
      expect(ve.errors.phone).toBeDefined();
    }
  });
});

describe("creditCardRule", () => {
  it("passes for a valid Luhn credit card number", async () => {
    const r = await validate({ card: "4532015112830366" }, { card: creditCardRule });
    expect(r.card).toBe("4532015112830366");
  });

  it("fails for an invalid credit card number", async () => {
    try {
      await validate({ card: "1234567890123456" }, { card: creditCardRule });
    } catch (e) {
      const ve = e as ValidationError;
      expect(ve.errors.card).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Multiple errors accumulation
// ---------------------------------------------------------------------------
describe("multiple validation errors", () => {
  it("collects errors for multiple failing fields", async () => {
    try {
      await validate(
        {},
        { email: "required|email", password: "required|string|min:6" },
      );
    } catch (e) {
      const ve = e as ValidationError;
      expect(ve.errors.email).toContain("required");
      expect(ve.errors.password).toContain("required");
      expect(ve.message).toMatch(/and 1 more error/);
    }
  });
});

// ---------------------------------------------------------------------------
// Full registration flow (matches the KAZI register controller shape)
// ---------------------------------------------------------------------------
describe("registration validation (unique email flow)", () => {
  beforeEach(() => {
    mockExists.mockReset();
    mockWhere.mockReset();
  });

  it("passes for a new user registration with a fresh email", async () => {
    mockExists.mockResolvedValue(false);

    const result = await validate(
      {
        name: "Simon Kangi",
        email: "simon@example.com",
        password: "secret123",
        password_confirmation: "secret123",
      },
      {
        name: "required|string|max:191",
        email: "required|email|max:255|unique:users,email",
        password: "required|string|min:6|confirmed",
        password_confirmation: "required|string|min:6",
      },
    );

    expect(result.email).toBe("simon@example.com");
    expect(result.name).toBe("Simon Kangi");
  });

  it("fails with unique error when email is already registered", async () => {
    mockExists.mockResolvedValue(true);

    try {
      await validate(
        {
          name: "Simon Kangi",
          email: "existing@example.com",
          password: "secret123",
          password_confirmation: "secret123",
        },
        {
          name: "required|string|max:191",
          email: "required|email|max:255|unique:users,email",
          password: "required|string|min:6|confirmed",
          password_confirmation: "required|string|min:6",
        },
      );
      expect.fail("should have thrown");
    } catch (e) {
      const ve = e as ValidationError;
      expect(ve.errors.email).toContain("unique");
      expect(ve.messages.email[0]).toBe("email has already been taken.");
      expect(ve.message).toBe("email has already been taken.");
    }
  });

  it("fails validation for missing required fields", async () => {
    try {
      await validate(
        {},
        {
          name: "required|string|max:191",
          email: "required|email|max:255|unique:users,email",
          password: "required|string|min:6|confirmed",
          password_confirmation: "required|string|min:6",
        },
      );
    } catch (e) {
      const ve = e as ValidationError;
      expect(ve.errors.name).toContain("required");
      expect(ve.errors.email).toContain("required");
      expect(ve.errors.password).toContain("required");
    }
  });

  it("fails for a short password", async () => {
    mockExists.mockResolvedValue(false);

    await failsWith(
      {
        name: "Alice",
        email: "alice@example.com",
        password: "abc",
        password_confirmation: "abc",
      },
      {
        name: "required|string|max:191",
        email: "required|email|max:255|unique:users,email",
        password: "required|string|min:6|confirmed",
        password_confirmation: "required|string|min:6",
      },
      "password",
      "min",
    );
  });

  it("fails when password confirmation does not match", async () => {
    mockExists.mockResolvedValue(false);

    await failsWith(
      {
        name: "Alice",
        email: "alice@example.com",
        password: "secret123",
        password_confirmation: "different",
      },
      {
        name: "required|string|max:191",
        email: "required|email|max:255|unique:users,email",
        password: "required|string|min:6|confirmed",
        password_confirmation: "required|string|min:6",
      },
      "password",
      "confirmed",
    );
  });
});
