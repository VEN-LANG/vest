import { Model } from "@vest/db";

export class ValidationError extends Error {
  errors: Record<string, string[]>;
  messages: Record<string, string[]>;
  message: string;

  constructor(errors: Record<string, string[]>, messages?: Record<string, string[]>) {
    super("Validation failed");
    this.errors = errors;
    this.messages = messages || {};
    this.message = "unknown error";
    // 1. Get the total count of all errors in all arrays
    const totalErrors = Object.values(this.messages).reduce(
      (sum, currentArray) => sum + currentArray.length,
      0,
    );

    // 2. Get the first error to display
    const firstError = Object.values(this.messages).find((arr) => arr.length > 0)?.[0];

    if (firstError) {
      if (totalErrors > 1) {
        this.message = `${firstError} and ${totalErrors - 1} more error(s).`;
      } else {
        this.message = firstError;
      }
    }
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export type RuleFn = (
  value: any,
  field: string,
  payload?: any,
) => true | { ok: boolean; message?: string; value?: any } | false | Promise<any>;

export type RuleSpec =
  | string
  | RuleFn
  | { rule: string | RuleFn; messages?: Record<string, string> };

// Extended default message catalog
const defaultMessages: Record<string, string> = {
  // Basic types
  required: ":attribute field is required.",
  integer: ":attribute must be an integer.",
  numeric: ":attribute must be a number.",
  array: ":attribute must be an array.",
  json: ":attribute must be valid JSON.",
  email: ":attribute must be a valid email address.",
  boolean: ":attribute must be true or false.",
  date: ":attribute must be a valid date.",
  url: ":attribute must be a valid URL.",
  uuid: ":attribute must be a valid UUID.",
  object: ":attribute must be an object.",

  // Size constraints
  "min.numeric": ":attribute must be at least :min.",
  "min.string": ":attribute must be at least :min characters.",
  "min.array": ":attribute must have at least :min items.",
  "max.numeric": ":attribute may not be greater than :max.",
  "max.string": ":attribute may not be greater than :max characters.",
  "max.array": ":attribute may not have more than :max items.",
  "size.string": ":attribute must be exactly :size characters.",
  "size.array": ":attribute must contain exactly :size items.",
  "size.numeric": ":attribute must be exactly :size.",

  // Range constraints
  "between.numeric": ":attribute must be between :min and :max.",
  "between.string": ":attribute must be between :min and :max characters.",
  "between.array": ":attribute must have between :min and :max items.",

  // Format validations
  regex: ":attribute format is invalid.",
  regex_invalid: "Invalid regex pattern for :attribute validation.",
  phone: ":attribute must be a valid phone number.",
  credit_card: ":attribute must be a valid credit card number.",

  // Set operations
  in: ":attribute must be one of: :values.",
  not_in: ":attribute must not be one of: :values.",
  exists: "Selected :attribute is invalid.",
  unique: ":attribute has already been taken.",

  // String operations
  starts_with: ":attribute must start with one of: :prefixes.",
  ends_with: ":attribute must end with one of: :suffixes.",
  contains: ":attribute must contain :substring.",

  // Boolean operations
  accepted: ":attribute must be accepted.",
  declined: ":attribute must be declined.",

  // Comparison operations
  confirmed: ":attribute confirmation does not match.",
  different: ":attribute and :other must be different.",
  same: ":attribute and :other must be the same.",
  gt: ":attribute must be greater than :field.",
  gte: ":attribute must be greater than or equal to :field.",
  lt: ":attribute must be less than :field.",
  lte: ":attribute must be less than or equal to :field.",

  // Date / time comparisons
  before: ":attribute must be a date before :field.",
  before_or_equal: ":attribute must be a date before or equal to :field.",
  after: ":attribute must be a date after :field.",
  after_or_equal: ":attribute must be a date after or equal to :field.",
  date_equals: ":attribute must be the same date as :field.",
  date_format: ":attribute does not match the format :format.",
  time: ":attribute must be a valid time (HH:MM or HH:MM:SS).",
  datetime: ":attribute must be a valid date and time.",
  timezone: ":attribute must be a valid timezone.",

  // File validations
  file: ":attribute must be a file.",
  mimes: ":attribute must be a file of type: :values.",
  max_file_size: ":attribute may not be larger than :max MB.",

  // Conditional required
  required_if: ":attribute is required.",
  required_unless: ":attribute is required.",
  required_with: ":attribute is required when :values is present.",
  required_with_all: ":attribute is required when :values are all present.",
  required_without: ":attribute is required when :values is not present.",
  required_without_all: ":attribute is required when none of :values are present.",

  // Presence
  present: ":attribute field must be present.",

  // Custom
  invalid: ":attribute is invalid.",
  nested_validation_failed: ":attribute contains invalid data.",
  object_array: ":attribute must be an array of objects.",
};

/**
 * Parse a date string using multiple common formats.
 * Supports: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD, DD-MM-YYYY, MM-DD-YYYY,
 *           ISO 8601 strings, and any format natively understood by Date().
 *
 * Returns a valid Date object or null if parsing fails.
 */
function parseDate(val: any): Date | null {
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const str = String(val).trim();

  // Try manual patterns first to avoid JS native misinterpreting DD/MM/YYYY as MM/DD/YYYY
  const patterns: Array<{ re: RegExp; y: number; m: number; d: number }> = [
    // DD/MM/YYYY or DD/MM/YY
    { re: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, y: 3, m: 2, d: 1 },
    // DD-MM-YYYY or DD-MM-YY
    { re: /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/, y: 3, m: 2, d: 1 },
    // DD.MM.YYYY
    { re: /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/, y: 3, m: 2, d: 1 },
    // YYYY/MM/DD
    { re: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, y: 1, m: 2, d: 3 },
    // YYYY.MM.DD
    { re: /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/, y: 1, m: 2, d: 3 },
  ];

  for (const { re, y, m, d } of patterns) {
    const match = str.match(re);
    if (match) {
      let year = parseInt(match[y], 10);
      if (year < 100) year += year < 70 ? 2000 : 1900; // 2-digit year heuristic
      const month = parseInt(match[m], 10) - 1;
      const day = parseInt(match[d], 10);
      const dt = new Date(year, month, day);
      if (!isNaN(dt.getTime()) && dt.getMonth() === month) return dt;
    }
  }

  // Fall back to native parser for ISO 8601 and other unambiguous formats
  const native = new Date(str);
  if (!isNaN(native.getTime())) return native;

  return null;
}

// Helper functions
function formatMessage(template: string, ctx: Record<string, any>): string {
  return template.replace(/:([a-zA-Z_]+)/g, (_, key) =>
    ctx[key] !== undefined ? String(ctx[key]) : ":" + key,
  );
}

function resolveMessage(
  field: string,
  code: string,
  meta: Record<string, any>,
  custom?: Record<string, string>,
): string {
  let variantCode = code;
  if (["min", "max", "size", "between"].includes(code) && meta.kind) {
    variantCode = `${code}.${meta.kind}`;
  }

  const attrLabel = custom && custom[`attributes.${field}`] ? custom[`attributes.${field}`] : field;
  const candidates = [`${field}.${variantCode}`, `${field}.${code}`, variantCode, code];

  for (const c of candidates) {
    if (custom && custom[c]) return formatMessage(custom[c], { ...meta, attribute: attrLabel });
    if (defaultMessages[c])
      return formatMessage(defaultMessages[c], { ...meta, attribute: attrLabel });
  }

  return formatMessage(defaultMessages.invalid || "Invalid value", {
    ...meta,
    attribute: attrLabel,
  });
}

// Core validation function
export async function validate<T extends Record<string, any>>(
  payload: any,
  rules: Record<string, RuleSpec>,
  customMessages?: Record<string, string>,
): Promise<T> {
  const out = { ...(payload || {}) } as unknown as T & Record<string, any>;
  const errors: Record<string, string[]> = {};
  const messageErrors: Record<string, string[]> = {};
  const metaErrors: Record<string, { code: string; meta: Record<string, any> }[]> = {};
  const fieldMessagesMap: Record<string, Record<string, string>> = {};

  // Helper: normalize pattern (treat consecutive dots as wildcard)
  function normalizePattern(p: string) {
    return p
      .replace(/\.\.+/g, ".*")
      .replace(/(^|\.)\*(\.|$)/g, (_, a, b) => "*" + (b ? "." : ""))
      .replace(/\.\*/g, ".*");
  }

  // Helper: split pattern into segments, keeping empty segments as wildcard
  function splitSegments(pattern: string) {
    return pattern.split(".").map((s) => (s === "" ? "*" : s));
  }

  // Get value at path (path segments may include numeric indices)
  function getAtPath(obj: any, path: string) {
    if (!obj) return undefined;
    const segs = path.split(".");
    let cur = obj;
    for (const s of segs) {
      if (cur === undefined || cur === null) return undefined;
      // numeric index
      if (/^\d+$/.test(s)) {
        cur = cur[Number(s)];
      } else {
        cur = cur[s];
      }
    }
    return cur;
  }

  // Set value at path on target object, creating intermediate structures as needed
  function setAtPath(obj: any, path: string, value: any) {
    const segs = path.split(".");
    let cur = obj;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const isLast = i === segs.length - 1;
      const numeric = /^\d+$/.test(s);
      const key: any = numeric ? Number(s) : s;
      if (isLast) {
        cur[key] = value;
        return;
      }
      if (cur[key] === undefined || cur[key] === null) {
        // decide next container: if next segment is numeric, create array
        const nextSeg = segs[i + 1];
        cur[key] = /^\d+$/.test(nextSeg) ? [] : {};
      }
      cur = cur[key];
    }
  }

  // Expand a field pattern (with '*' wildcards) into concrete paths from the payload
  function expandFieldPaths(obj: any, pattern: string): string[] {
    if (!pattern) return [];
    // normalize patterns like 'roles..id' -> 'roles.*.id'
    const normalized = normalizePattern(pattern);
    const segs = splitSegments(normalized);
    const results: string[] = [];

    function recurse(current: any, idx: number, prefix: string) {
      if (idx >= segs.length) {
        results.push(prefix.replace(/^\./, ""));
        return;
      }

      const seg = segs[idx];
      if (seg === "*" || seg === "") {
        // wildcard: iterate array indices or object keys
        if (Array.isArray(current)) {
          for (let i = 0; i < current.length; i++) {
            recurse(current[i], idx + 1, prefix + "." + i);
          }
        } else if (current && typeof current === "object") {
          for (const k of Object.keys(current)) {
            recurse(current[k], idx + 1, prefix + "." + k);
          }
        } else {
          // If current is undefined but the parent path in the original object
          // contains a string that can be normalized into an array (e.g. CSV or JSON),
          // try to normalize it and expand using the resulting array so rules like
          // 'roles.*' validate individual elements when 'roles' was submitted as a CSV/string.
          const parentPath = prefix.replace(/^\./, "");
          let parentVal: any = undefined;
          try {
            parentVal = parentPath ? getAtPath(obj, parentPath) : obj;
          } catch (e) {
            parentVal = undefined;
          }

          if (typeof parentVal === "string") {
            // try JSON
            try {
              const parsed = JSON.parse(parentVal);
              if (Array.isArray(parsed)) {
                for (let i = 0; i < parsed.length; i++) {
                  recurse(parsed[i], idx + 1, prefix + "." + i);
                }
                return;
              }
            } catch {}

            // try CSV
            if (parentVal.includes(",")) {
              const parts = parentVal
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean);
              for (let i = 0; i < parts.length; i++) {
                recurse(parts[i], idx + 1, prefix + "." + i);
              }
              return;
            }
          }

          // nothing to expand; still push an unresolved path segment so validators can check existence
          recurse(undefined, idx + 1, prefix + ".*");
        }
      } else {
        // literal segment
        if (current && (typeof current === "object" || Array.isArray(current)) && seg in current) {
          recurse(current[seg], idx + 1, prefix + "." + seg);
        } else if (current && Array.isArray(current) && /^\d+$/.test(seg)) {
          const n = Number(seg);
          recurse(current[n], idx + 1, prefix + "." + seg);
        } else {
          // path doesn't exist in payload; still return the concrete path as-is
          recurse(undefined, idx + 1, prefix + "." + seg);
        }
      }
    }

    recurse(obj, 0, "");

    // If nothing matched (e.g., no payload), and pattern has no wildcard, return the original pattern
    if (results.length === 0) {
      if (!pattern.includes("*")) return [pattern];
      return [];
    }

    // remove duplicates
    return Array.from(new Set(results));
  }

  for (const fieldPattern of Object.keys(rules)) {
    const spec = rules[fieldPattern];
    let fieldRule: string | RuleFn;

    // Parse rule specification
    if (typeof spec === "object" && spec && typeof spec !== "function" && "rule" in spec) {
      fieldRule = spec.rule as any;
      if (spec.messages) {
        const prefixed: Record<string, string> = {};
        for (const [k, v] of Object.entries(spec.messages)) {
          prefixed[k.startsWith(fieldPattern + ".") ? k : `${fieldPattern}.${k}`] = v;
        }
        fieldMessagesMap[fieldPattern] = prefixed;
      }
    } else {
      fieldRule = spec as any;
    }

    // Resolve target paths for this pattern
    // Expand against the current normalized output so prior conversions (like array normalization)
    // are taken into account when resolving wildcard paths (e.g. 'roles.*').
    const targetPaths = expandFieldPaths(out, fieldPattern);

    // If wildcard pattern and nothing matched, skip validation
    if (fieldPattern.includes("*") && targetPaths.length === 0) continue;

    // Resolve any unresolved wildcard placeholders (e.g. 'roles.*') by looking up the parent
    // value in the normalized output and expanding indices from arrays/CSV/JSON strings.
    let pathsToValidate: string[] = [];
    for (const tp of targetPaths.length ? targetPaths : [fieldPattern]) {
      if (tp.includes(".*") || tp.includes("*")) {
        const parentPath = tp.replace(/\.(?:\*|\.)+$/, "").replace(/\*$/, "");
        const parentVal = parentPath ? getAtPath(out, parentPath) : out;
        if (Array.isArray(parentVal)) {
          for (let i = 0; i < parentVal.length; i++) pathsToValidate.push(`${parentPath}.${i}`);
          continue;
        }
        if (typeof parentVal === "string") {
          try {
            const parsed = JSON.parse(parentVal);
            if (Array.isArray(parsed)) {
              for (let i = 0; i < parsed.length; i++) pathsToValidate.push(`${parentPath}.${i}`);
              continue;
            }
          } catch {}
          if (parentVal.includes(",")) {
            const parts = parentVal
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
            for (let i = 0; i < parts.length; i++) pathsToValidate.push(`${parentPath}.${i}`);
            continue;
          }
        }
        // fallback: keep unresolved path so a missing value gets handled by required/nullable logic
        pathsToValidate.push(tp);
      } else {
        pathsToValidate.push(tp);
      }
    }

    for (const field of pathsToValidate) {
      // Read from the normalized output object so earlier normalization (e.g. array conversions)
      // is visible to subsequent wildcard expansions and validations (eg. 'roles' -> array then 'roles.*').
      const raw = getAtPath(out, field);

      // Handle function rules
      if (typeof fieldRule === "function") {
        const res = await (fieldRule as RuleFn)(raw, field, out);
        if (res === true) continue;
        if (res === false) {
          pushError(field, "invalid", { value: raw, kind: typeof raw });
          continue;
        }
        if (res && (res as any).ok === false) {
          const msgCode = (res as any).message || "invalid";
          pushError(field, msgCode, { value: raw, kind: typeof raw });
          continue;
        }
        if (res && (res as any).ok === true && "value" in (res as any)) {
          setAtPath(out, field, (res as any).value);
          continue;
        }
        continue;
      }

      // Handle string rules
      const parts = String(fieldRule)
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);

      const isRequired = parts.includes("required");
      const isNullable = parts.includes("nullable");
      const isSometimes = parts.includes("sometimes");
      const isPresent = parts.includes("present");
      const present = raw !== undefined && raw !== null && raw !== "";

      // ── Conditional required rules ──────────────────────────────────────
      // required_if:field,val1,val2,...      → required when payload[field] equals any value
      // required_unless:field,val1,val2,...  → required unless payload[field] equals any value
      // required_with:f1,f2,...              → required when ANY of the listed fields are present
      // required_with_all:f1,f2,...          → required when ALL listed fields are present
      // required_without:f1,f2,...           → required when ANY listed field is absent
      // required_without_all:f1,f2,...       → required when ALL listed fields are absent
      let conditionalRequired = false;

      for (const p of parts) {
        if (p.startsWith("required_if:")) {
          const [condField, ...values] = p
            .slice("required_if:".length)
            .split(",")
            .map((s) => s.trim());
          const condVal = String(getAtPath(out, condField) ?? "");
          if (values.some((v) => v === condVal)) conditionalRequired = true;
        } else if (p.startsWith("required_unless:")) {
          const [condField, ...values] = p
            .slice("required_unless:".length)
            .split(",")
            .map((s) => s.trim());
          const condVal = String(getAtPath(out, condField) ?? "");
          if (!values.some((v) => v === condVal)) conditionalRequired = true;
        } else if (p.startsWith("required_with:")) {
          const fields = p
            .slice("required_with:".length)
            .split(",")
            .map((s) => s.trim());
          if (
            fields.some((f) => {
              const v = getAtPath(out, f);
              return v !== undefined && v !== null && v !== "";
            })
          )
            conditionalRequired = true;
        } else if (p.startsWith("required_with_all:")) {
          const fields = p
            .slice("required_with_all:".length)
            .split(",")
            .map((s) => s.trim());
          if (
            fields.every((f) => {
              const v = getAtPath(out, f);
              return v !== undefined && v !== null && v !== "";
            })
          )
            conditionalRequired = true;
        } else if (p.startsWith("required_without:")) {
          const fields = p
            .slice("required_without:".length)
            .split(",")
            .map((s) => s.trim());
          if (
            fields.some((f) => {
              const v = getAtPath(out, f);
              return v === undefined || v === null || v === "";
            })
          )
            conditionalRequired = true;
        } else if (p.startsWith("required_without_all:")) {
          const fields = p
            .slice("required_without_all:".length)
            .split(",")
            .map((s) => s.trim());
          if (
            fields.every((f) => {
              const v = getAtPath(out, f);
              return v === undefined || v === null || v === "";
            })
          )
            conditionalRequired = true;
        }
      }

      const effectiveRequired = isRequired || conditionalRequired;

      // `sometimes` — only run validation rules when the field was actually sent
      if (isSometimes && !present) continue;

      // `present` — the key must exist in the payload (null / empty allowed)
      if (isPresent && raw === undefined) {
        pushError(field, "present", { value: raw });
        continue;
      }

      // Enforce required / conditional-required
      if (effectiveRequired && !present) {
        pushError(field, "required", { value: raw });
        continue;
      }

      // Skip remaining rules for nullable/optional empty fields
      if (!present && (isNullable || !effectiveRequired)) {
        continue;
      }

      let val: any = raw;
      let failed = false;

      // Process each rule part
      for (const p of parts) {
        if (p === "required" || p === "nullable" || p === "sometimes" || p === "present") continue;
        if (
          p.startsWith("required_if:") ||
          p.startsWith("required_unless:") ||
          p.startsWith("required_with:") ||
          p.startsWith("required_with_all:") ||
          p.startsWith("required_without:") ||
          p.startsWith("required_without_all:")
        )
          continue;

        if (failed) break;

        // Type conversion and validation rules
        switch (true) {
          case p === "string":
            if (typeof val !== "string") val = String(val);
            break;

          case p === "email":
            if (typeof val !== "string") val = String(val);
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val)) {
              pushError(field, "email", { value: val, kind: "string" });
              failed = true;
            }
            break;

          case p === "int" || p === "integer":
            const intVal = parseInt(val, 10);
            if (Number.isNaN(intVal)) {
              pushError(field, "integer", { value: val, kind: typeof val });
              failed = true;
            } else {
              val = intVal;
            }
            break;

          case p === "numeric" || p === "float" || p === "double":
            const numVal = Number(val);
            if (Number.isNaN(numVal)) {
              pushError(field, "numeric", { value: val, kind: typeof val });
              failed = true;
            } else {
              val = numVal;
            }
            break;

          case p === "boolean":
            if (typeof val === "string") {
              const lowerVal = val.toLowerCase();
              if (["true", "1", "yes", "on"].includes(lowerVal)) {
                val = true;
              } else if (["false", "0", "no", "off"].includes(lowerVal)) {
                val = false;
              } else {
                pushError(field, "boolean", { value: val, kind: typeof val });
                failed = true;
              }
            } else if (typeof val !== "boolean") {
              pushError(field, "boolean", { value: val, kind: typeof val });
              failed = true;
            }
            break;

          case p === "array":
            if (!Array.isArray(val)) {
              if (typeof val === "string") {
                try {
                  const parsed = JSON.parse(val);
                  if (Array.isArray(parsed)) val = parsed;
                  else {
                    pushError(field, "array", { value: val, kind: typeof val });
                    failed = true;
                  }
                } catch {
                  pushError(field, "array", { value: val, kind: typeof val });
                  failed = true;
                }
              } else {
                pushError(field, "array", { value: val, kind: typeof val });
                failed = true;
              }
            }
            break;

          case p === "json":
            if (typeof val === "string") {
              try {
                val = JSON.parse(val);
              } catch {
                pushError(field, "json", { value: val, kind: typeof val });
                failed = true;
              }
            }
            break;

          case p === "date": {
            const date = parseDate(val);
            if (!date) {
              pushError(field, "date", { value: val, kind: typeof val });
              failed = true;
            } else {
              val = date;
            }
            break;
          }

          case p === "url":
            try {
              new URL(val);
            } catch {
              pushError(field, "url", { value: val, kind: typeof val });
              failed = true;
            }
            break;

          case p === "uuid":
            const uuidRegex =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(String(val))) {
              pushError(field, "uuid", { value: val, kind: typeof val });
              failed = true;
            }
            break;

          case p === "phone":
            // Phone regex supports multiple formats:
            // With country code: +1 234 567 8900, +1-234-567-8900, +12345678900
            // Without country code: 234 567 8900, 234-567-8900, (234) 567-8900
            // Local format starting with 0: 0769677859, 076-967-7859, (076) 967-7859
            // Minimum 7 digits (local) to 15 digits (with country code)
            const phoneRegex = /^(\+\d{1,3}[\s\-]?)?([0-9]|\(\d{1,4}\))[\d\s\-]{5,}$/;
            const cleanedPhone = String(val).replace(/[\s\-\(\)]/g, "");
            // Must have at least 7 digits (local) or 10+ digits (with country code)
            const digitCount = cleanedPhone.replace(/\D/g, "").length;
            if (!phoneRegex.test(String(val)) || digitCount < 7 || digitCount > 15) {
              pushError(field, "phone", { value: val, kind: typeof val });
              failed = true;
            }
            break;

          case p.startsWith("min:"):
            await handleMinRule(field, val, p);
            break;

          case p.startsWith("max:"):
            await handleMaxRule(field, val, p);
            break;

          case p.startsWith("size:"):
            await handleSizeRule(field, val, p);
            break;

          case p.startsWith("between:"):
            await handleBetweenRule(field, val, p);
            break;

          case p.startsWith("in:"):
            await handleInRule(field, val, p);
            break;

          case p.startsWith("not_in:"):
            await handleNotInRule(field, val, p);
            break;

          case p.startsWith("exists:"):
            // If nullable and value is empty, skip exists check
            if ((raw === undefined || raw === null || raw === "") && parts.includes("nullable"))
              break;
            await handleExistsRule(field, val, p);
            break;

          case p.startsWith("unique:"):
            await handleUniqueRule(field, val, p);
            break;

          case p.startsWith("regex:"):
            await handleRegexRule(field, val, p);
            break;

          case p.startsWith("starts_with:"):
            await handleStartsWithRule(field, val, p);
            break;

          case p.startsWith("ends_with:"):
            await handleEndsWithRule(field, val, p);
            break;

          case p.startsWith("contains:"):
            await handleContainsRule(field, val, p);
            break;

          case p.startsWith("gt:"):
            await handleComparisonRule(field, val, p, "gt", out);
            break;

          case p.startsWith("gte:"):
            await handleComparisonRule(field, val, p, "gte", out);
            break;

          case p.startsWith("lt:"):
            await handleComparisonRule(field, val, p, "lt", out);
            break;

          case p.startsWith("lte:"):
            await handleComparisonRule(field, val, p, "lte", out);
            break;

          case p.startsWith("before:"):
            await handleDateComparisonRule(field, val, p, "before", out);
            break;

          case p.startsWith("before_or_equal:"):
            await handleDateComparisonRule(field, val, p, "before_or_equal", out);
            break;

          case p.startsWith("after:"):
            await handleDateComparisonRule(field, val, p, "after", out);
            break;

          case p.startsWith("after_or_equal:"):
            await handleDateComparisonRule(field, val, p, "after_or_equal", out);
            break;

          case p.startsWith("date_equals:"):
            await handleDateComparisonRule(field, val, p, "date_equals", out);
            break;

          case p.startsWith("date_format:"):
            await handleDateFormatRule(field, raw, p); // always validate the original input string
            break;

          case p === "time":
            if (typeof val !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(val)) {
              pushError(field, "time", { value: val });
              failed = true;
            }
            break;

          case p === "datetime": {
            const dtVal = parseDate(val);
            if (!dtVal) {
              pushError(field, "datetime", { value: val });
              failed = true;
            } else {
              val = dtVal;
            }
            break;
          }

          case p === "timezone":
            try {
              Intl.DateTimeFormat(undefined, { timeZone: String(val) });
            } catch {
              pushError(field, "timezone", { value: val });
              failed = true;
            }
            break;

          case p === "accepted":
            const accepted = [true, 1, "1", "yes", "on"];
            if (!accepted.includes(val)) {
              pushError(field, "accepted", { value: val });
              failed = true;
            }
            break;

          case p === "declined":
            const declined = [false, 0, "0", "no", "off"];
            if (!declined.includes(val)) {
              pushError(field, "declined", { value: val });
              failed = true;
            }
            break;

          case p === "confirmed":
            const confirmationField = `${field}_confirmation`;
            if (
              out &&
              (out[confirmationField] ||
                out["confirmation_" + field] ||
                out[field + "_confirmed"] ||
                out["confirmed_" + field] ||
                out["confirm_" + field] ||
                out["confirm_" + field]) !== val
            ) {
              pushError(field, "confirmed", { other: confirmationField });
              failed = true;
            }
            break;

          case p.startsWith("different:"):
            const diffField = p.split(":")[1];
            if (out && out[diffField] === val) {
              pushError(field, "different", { other: diffField });
              failed = true;
            }
            break;

          case p.startsWith("same:"):
            const sameField = p.split(":")[1];
            if (out && out[sameField] !== val) {
              pushError(field, "same", { other: sameField });
              failed = true;
            }
            break;

          default:
            // Unknown rule - ignore
            break;
        }
      }

      if (!failed) setAtPath(out, field, val);
    }
  }

  // Helper function to push errors
  function pushError(field: string, code: string, meta: Record<string, any> = {}) {
    errors[field] = errors[field] || [];
    errors[field].push(code);
    metaErrors[field] = metaErrors[field] || [];
    metaErrors[field].push({ code, meta });
  }

  // Generate human-readable messages
  for (const field of Object.keys(metaErrors)) {
    for (const item of metaErrors[field]) {
      const merged = { ...(customMessages || {}), ...(fieldMessagesMap[field] || {}) };
      const msg = resolveMessage(field, item.code, item.meta, merged);
      messageErrors[field] = messageErrors[field] || [];
      messageErrors[field].push(msg);
    }
  }

  if (Object.keys(errors).length) {
    throw new ValidationError(errors, messageErrors);
  }

  return out as T;

  // Rule handler functions
  async function handleMinRule(field: string, val: any, rule: string) {
    const arg = Number(rule.split(":")[1]);
    if (typeof val === "number") {
      if (val < arg) {
        pushError(field, "min", { min: arg, value: val, kind: "numeric" });
        return true;
      }
    } else if (typeof val === "string") {
      if (val.length < arg) {
        pushError(field, "min", { min: arg, value: val, kind: "string" });
        return true;
      }
    } else if (Array.isArray(val)) {
      if (val.length < arg) {
        pushError(field, "min", { min: arg, value: val, kind: "array" });
        return true;
      }
    }
    return false;
  }

  async function handleMaxRule(field: string, val: any, rule: string) {
    const arg = Number(rule.split(":")[1]);
    if (typeof val === "number") {
      if (val > arg) {
        pushError(field, "max", { max: arg, value: val, kind: "numeric" });
        return true;
      }
    } else if (typeof val === "string") {
      if (val.length > arg) {
        pushError(field, "max", { max: arg, value: val, kind: "string" });
        return true;
      }
    } else if (Array.isArray(val)) {
      if (val.length > arg) {
        pushError(field, "max", { max: arg, value: val, kind: "array" });
        return true;
      }
    }
    return false;
  }

  async function handleSizeRule(field: string, val: any, rule: string) {
    const arg = Number(rule.split(":")[1]);
    if (typeof val === "number") {
      if (val !== arg) {
        pushError(field, "size", { size: arg, value: val, kind: "numeric" });
        return true;
      }
    } else if (typeof val === "string") {
      if (val.length !== arg) {
        pushError(field, "size", { size: arg, value: val, kind: "string" });
        return true;
      }
    } else if (Array.isArray(val)) {
      if (val.length !== arg) {
        pushError(field, "size", { size: arg, value: val, kind: "array" });
        return true;
      }
    }
    return false;
  }

  async function handleBetweenRule(field: string, val: any, rule: string) {
    const args = rule.split(":")[1].split(",").map(Number);
    const [min, max] = args;
    if (typeof val === "number") {
      if (val < min || val > max) {
        pushError(field, "between", { min, max, value: val, kind: "numeric" });
        return true;
      }
    } else if (typeof val === "string") {
      if (val.length < min || val.length > max) {
        pushError(field, "between", { min, max, value: val, kind: "string" });
        return true;
      }
    } else if (Array.isArray(val)) {
      if (val.length < min || val.length > max) {
        pushError(field, "between", { min, max, value: val, kind: "array" });
        return true;
      }
    }
    return false;
  }

  async function handleInRule(field: string, val: any, rule: string) {
    const opts = rule
      .split(":")[1]
      .split(",")
      .map((s) => s.trim());
    if (!opts.includes(String(val))) {
      pushError(field, "in", { value: val, values: opts.join(", ") });
      return true;
    }
    return false;
  }

  async function handleNotInRule(field: string, val: any, rule: string) {
    const opts = rule
      .split(":")[1]
      .split(",")
      .map((s) => s.trim());
    if (opts.includes(String(val))) {
      pushError(field, "not_in", { value: val, values: opts.join(", ") });
      return true;
    }
    return false;
  }

  async function handleExistsRule(field: string, val: any, rule: string) {
    try {
      const spec = rule.split(":")[1];
      let [table, column] = spec.split(",");
      table = (table || "").trim();
      column = (column || "id").trim();

      class ValidatorModel extends Model {
        static table = table;
        static primaryKey = "id";
        static fillable = [column];
      }
      const exists = await ValidatorModel.query().where(column, "=", val).exists();
      if (!exists) {
        pushError(field, "exists", { value: val, table, column });
        return true;
      }
    } catch (e) {
      pushError(field, "exists", { value: val });
      return true;
    }
    return false;
  }

  async function handleUniqueRule(field: string, val: any, rule: string) {
    try {
      const spec = rule.split(":")[1];
      const partsSpec = spec.split(",").map((s) => s.trim());
      const table = partsSpec[0];
      let column = partsSpec[1] || "id";
      // partsSpec may be: [table, column, exceptValue] (existing behavior)
      // or [table, column, exceptColumn, exceptValue] (new behavior)
      const exceptArg = partsSpec[2];
      const exceptArg2 = partsSpec[3];

      class ValidatorModel extends Model {
        static table = table;
        static primaryKey = "id";
        static fillable = [column];
      }

      // Determine except column and except value
      let exceptColumn = ValidatorModel.primaryKey; // default 'id'
      let exceptValue = exceptArg;
      if (exceptArg2 !== undefined) {
        // caller provided explicit except column then value
        exceptColumn = exceptArg;
        exceptValue = exceptArg2;
      } else if (exceptArg !== undefined) {
        // caller provided explicit except value
        exceptValue = exceptArg;
      }

      let q = ValidatorModel.query().where(column, "=", val);
      // Only add exclusion when an explicit except value was provided (non-empty)
      if (exceptValue !== undefined && exceptValue !== null && String(exceptValue) !== "") {
        q = q.where(function (query) {
          query.where(exceptColumn, "!=", exceptValue);
        });
      }
      const exists = await q.exists();
      if (exists) {
        pushError(field, "unique", { value: val, table, column });
        return true;
      }
    } catch (e) {
      pushError(field, "unique", { value: val });
      return true;
    }
    return false;
  }

  async function handleRegexRule(field: string, val: any, rule: string) {
    const pattern = rule.split(":")[1];
    try {
      const regex = new RegExp(pattern);
      if (!regex.test(String(val))) {
        pushError(field, "regex", { value: val, pattern });
        return true;
      }
    } catch {
      pushError(field, "regex_invalid", { value: val, pattern });
      return true;
    }
    return false;
  }

  async function handleStartsWithRule(field: string, val: any, rule: string) {
    const prefixes = rule
      .split(":")[1]
      .split(",")
      .map((s) => s.trim());
    const strVal = String(val);
    if (!prefixes.some((prefix) => strVal.startsWith(prefix))) {
      pushError(field, "starts_with", { value: val, prefixes: prefixes.join(", ") });
      return true;
    }
    return false;
  }

  async function handleEndsWithRule(field: string, val: any, rule: string) {
    const suffixes = rule
      .split(":")[1]
      .split(",")
      .map((s) => s.trim());
    const strVal = String(val);
    if (!suffixes.some((suffix) => strVal.endsWith(suffix))) {
      pushError(field, "ends_with", { value: val, suffixes: suffixes.join(", ") });
      return true;
    }
    return false;
  }

  async function handleContainsRule(field: string, val: any, rule: string) {
    const substring = rule.split(":")[1];
    const strVal = String(val);
    if (!strVal.includes(substring)) {
      pushError(field, "contains", { value: val, substring });
      return true;
    }
    return false;
  }

  async function handleComparisonRule(
    field: string,
    val: any,
    rule: string,
    operator: string,
    payload: any,
  ) {
    const otherField = rule.split(":")[1];
    const otherValue = payload ? getAtPath(payload, otherField) : undefined;

    if (otherValue === undefined) return false;

    // Try numeric comparison first
    const numVal = Number(val);
    const numOther = Number(otherValue);

    if (!isNaN(numVal) && !isNaN(numOther)) {
      let isValid = false;
      switch (operator) {
        case "gt":
          isValid = numVal > numOther;
          break;
        case "gte":
          isValid = numVal >= numOther;
          break;
        case "lt":
          isValid = numVal < numOther;
          break;
        case "lte":
          isValid = numVal <= numOther;
          break;
      }
      if (!isValid) {
        pushError(field, operator, { field: otherField, value: val, other: otherValue });
        return true;
      }
      return false;
    }

    // Try date comparison
    const dateVal = parseDate(val);
    const dateOther = parseDate(otherValue);
    if (dateVal && dateOther) {
      const tVal = dateVal.getTime();
      const tOther = dateOther.getTime();
      let isValid = false;
      switch (operator) {
        case "gt":
          isValid = tVal > tOther;
          break;
        case "gte":
          isValid = tVal >= tOther;
          break;
        case "lt":
          isValid = tVal < tOther;
          break;
        case "lte":
          isValid = tVal <= tOther;
          break;
      }
      if (!isValid) {
        pushError(field, operator, { field: otherField, value: val, other: otherValue });
        return true;
      }
      return false;
    }

    // Fallback: lexicographic string comparison
    const strVal = String(val);
    const strOther = String(otherValue);
    let isValid = false;
    switch (operator) {
      case "gt":
        isValid = strVal > strOther;
        break;
      case "gte":
        isValid = strVal >= strOther;
        break;
      case "lt":
        isValid = strVal < strOther;
        break;
      case "lte":
        isValid = strVal <= strOther;
        break;
    }
    if (!isValid) {
      pushError(field, operator, { field: otherField, value: val, other: otherValue });
      return true;
    }
    return false;
  }

  async function handleDateComparisonRule(
    field: string,
    val: any,
    rule: string,
    operator: string,
    payload: any,
  ) {
    const otherField = rule.split(":")[1];

    // Allow comparing against a literal date string (e.g. before:2025-01-01) or another field
    let otherRaw = payload ? getAtPath(payload, otherField) : undefined;
    if (otherRaw === undefined) otherRaw = otherField; // treat as literal

    // Handle special keywords and relative date expressions
    if (typeof otherRaw === "string") {
      const lower = otherRaw.toLowerCase().trim();
      if (lower === "today") {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        otherRaw = t;
      } else if (lower === "yesterday") {
        const t = new Date();
        t.setDate(t.getDate() - 1);
        t.setHours(0, 0, 0, 0);
        otherRaw = t;
      } else if (lower === "tomorrow") {
        const t = new Date();
        t.setDate(t.getDate() + 1);
        t.setHours(0, 0, 0, 0);
        otherRaw = t;
      } else {
        /*
         * Relative date expression syntax (case-insensitive):
         *   <anchor>[+|-]<N><unit>
         *
         * Anchors : today, yesterday, tomorrow, now
         * Units   : day(s), week(s), month(s), year(s)
         *
         * Examples:
         *   today+5days        →  5 days from today
         *   today-2weeks       →  2 weeks before today
         *   today+1month       →  1 month from today
         *   today+2months      →  2 months from today
         *   today+1year        →  1 year from today
         *   today+2years       →  2 years from today
         *   yesterday+1week    →  1 week after yesterday
         *   tomorrow-1month    →  1 month before tomorrow
         */
        const relMatch = lower.match(
          /^(today|yesterday|tomorrow|now)([+-])(\d+)(days?|weeks?|months?|years?)$/,
        );
        if (relMatch) {
          const [, anchor, sign, numStr, unit] = relMatch;
          const n = parseInt(numStr, 10) * (sign === "+" ? 1 : -1);
          const t = new Date();
          t.setHours(0, 0, 0, 0);
          if (anchor === "yesterday") t.setDate(t.getDate() - 1);
          if (anchor === "tomorrow") t.setDate(t.getDate() + 1);
          if (unit.startsWith("day")) t.setDate(t.getDate() + n);
          if (unit.startsWith("week")) t.setDate(t.getDate() + n * 7);
          if (unit.startsWith("month")) t.setMonth(t.getMonth() + n);
          if (unit.startsWith("year")) t.setFullYear(t.getFullYear() + n);
          otherRaw = t;
        }
      }
    }

    const dateVal = parseDate(val);
    const dateOther = parseDate(otherRaw);

    if (!dateVal) {
      pushError(field, "date", { value: val });
      return true;
    }
    if (!dateOther) {
      // other field value is not a valid date – skip
      return false;
    }

    const tVal = dateVal.getTime();
    const tOther = dateOther.getTime();

    let isValid = false;
    switch (operator) {
      case "before":
        isValid = tVal < tOther;
        break;
      case "before_or_equal":
        isValid = tVal <= tOther;
        break;
      case "after":
        isValid = tVal > tOther;
        break;
      case "after_or_equal":
        isValid = tVal >= tOther;
        break;
      case "date_equals":
        isValid = tVal === tOther;
        break;
    }

    if (!isValid) {
      pushError(field, operator, { field: otherField, value: val, other: otherRaw });
      return true;
    }
    return false;
  }

  async function handleDateFormatRule(field: string, val: any, rule: string) {
    const format = rule.slice("date_format:".length);
    const strVal = String(val);

    /*
    |--------------------------------------------------------------------------
    | Supported Format Tokens & Examples
    |--------------------------------------------------------------------------
    |
    | Token  Description              Example value
    | ------  -----------------------  ----------------------------
    | YYYY   4-digit year             2026
    | YY     2-digit year             26
    | MM     2-digit month (01–12)    04
    | DD     2-digit day   (01–31)    16
    | HH     2-digit hour  (00–23)    09  |  23
    | mm     2-digit minute (00–59)   05  |  59
    | ss     2-digit second (00–59)   00  |  30
    | SSS    3-digit millisecond      000 |  123
    | Z      UTC offset or Z          Z   |  +03:00  |  -05:30
    |
    |--------------------------------------------------------------------------
    | Format string examples  →  matching exact value
    |--------------------------------------------------------------------------
    |
    | 'YYYY-MM-DD'               →  '2026-04-16'
    | 'DD/MM/YYYY'               →  '16/04/2026'
    | 'MM/DD/YYYY'               →  '04/16/2026'
    | 'YYYY/MM/DD'               →  '2026/04/16'
    | 'DD-MM-YYYY'               →  '16-04-2026'
    | 'YYYY-MM-DD HH:mm'         →  '2026-04-16 09:05'
    | 'YYYY-MM-DD HH:mm:ss'      →  '2026-04-16 09:05:30'
    | 'YYYY-MM-DDTHH:mm:ss'      →  '2026-04-16T09:05:30'
    | 'YYYY-MM-DDTHH:mm:ssZ'     →  '2026-04-16T09:05:30Z'
    | 'YYYY-MM-DDTHH:mm:ss+03:00'→  '2026-04-16T09:05:30+03:00'
    | 'YYYY-MM-DDTHH:mm:ss.SSSZ' →  '2026-04-16T09:05:30.123Z'
    | 'HH:mm'                    →  '09:05'
    | 'HH:mm:ss'                 →  '09:05:30'
    | 'DD/MM/YYYY HH:mm'         →  '16/04/2026 09:05'
    | 'MM-DD-YYYY HH:mm:ss'      →  '04-16-2026 09:05:30'
    | 'YYYY.MM.DD'               →  '2026.04.16'
    | 'YY-MM-DD'                 →  '26-04-16'
    |
    | Usage in rules:
    |   'birth_date'  : 'required|date_format:YYYY-MM-DD'
    |   'event_time'  : 'required|date_format:YYYY-MM-DD HH:mm:ss'
    |   'iso_ts'      : 'required|date_format:YYYY-MM-DDTHH:mm:ssZ'
    |--------------------------------------------------------------------------
    */

    // Map common format tokens to regex pieces
    const tokenMap: Record<string, string> = {
      YYYY: "\\d{4}",
      YY: "\\d{2}",
      MM: "(?:0[1-9]|1[0-2])",
      DD: "(?:0[1-9]|[12]\\d|3[01])",
      HH: "(?:[01]\\d|2[0-3])",
      mm: "[0-5]\\d",
      ss: "[0-5]\\d",
      SSS: "\\d{3}",
      Z: "(?:Z|[+-]\\d{2}:\\d{2})",
    };

    let pattern = format;
    // Escape special regex chars except the ones we'll replace
    pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Replace format tokens (longest first to avoid partial matches)
    for (const token of Object.keys(tokenMap).sort((a, b) => b.length - a.length)) {
      pattern = pattern.replace(
        new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        tokenMap[token],
      );
    }

    const regex = new RegExp("^" + pattern + "$");
    if (!regex.test(strVal)) {
      pushError(field, "date_format", { value: val, format });
      return true;
    }
    return false;
  }
}

// Custom rule functions
export const requiredIf =
  (otherField: string, value: any): RuleFn =>
  async (val, field, payload) => {
    if (payload && payload[otherField] === value) {
      if (val === undefined || val === null || val === "") {
        return { ok: false, message: "required" };
      }
    }
    return true;
  };

export const requiredUnless =
  (otherField: string, value: any): RuleFn =>
  async (val, field, payload) => {
    if (payload && payload[otherField] !== value) {
      if (val === undefined || val === null || val === "") {
        return { ok: false, message: "required" };
      }
    }
    return true;
  };

// File validation rules
export const fileRule: RuleFn = async (value) => {
  if (!value) return true;

  if (
    typeof value === "object" &&
    (value instanceof File || ("name" in value && "size" in value))
  ) {
    return true;
  }

  return { ok: false, message: "file" };
};

export const mimes =
  (allowedTypes: string[]): RuleFn =>
  async (value) => {
    if (!value) return true;

    let fileName = "";
    if (typeof value === "string") {
      fileName = value;
    } else if (value && typeof value === "object") {
      fileName = value.name || "";
    }

    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    const mimeTypes: Record<string, string[]> = {
      jpg: ["image/jpeg"],
      jpeg: ["image/jpeg"],
      png: ["image/png"],
      gif: ["image/gif"],
      pdf: ["application/pdf"],
      doc: ["application/msword"],
      docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    };

    const allowedExtensions = allowedTypes
      .map((type) => {
        for (const [ext, mimes] of Object.entries(mimeTypes)) {
          if (mimes.includes(type)) return ext;
        }
        return type.split("/").pop();
      })
      .filter(Boolean);

    if (!allowedExtensions.includes(extension)) {
      return { ok: false, message: "mimes", value: allowedTypes.join(", ") };
    }

    return true;
  };

export const maxFileSize =
  (maxSizeInMB: number): RuleFn =>
  async (value) => {
    if (!value) return true;

    let fileSize = 0;
    if (value instanceof File) {
      fileSize = value.size;
    } else if (value && typeof value === "object" && "size" in value) {
      fileSize = value.size;
    }

    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (fileSize > maxSizeInBytes) {
      return { ok: false, message: "max_file_size", value: maxSizeInMB };
    }

    return true;
  };

// Phone number validation
export const phoneRule: RuleFn = (value) => {
  if (!value) return true;

  // Phone regex supports multiple formats:
  // With country code: +1 234 567 8900, +1-234-567-8900, +12345678900
  // Without country code: 234 567 8900, 234-567-8900, (234) 567-8900
  // Local format starting with 0: 0769677859, 076-967-7859, (076) 967-7859
  // Minimum 7 digits (local) to 15 digits (with country code)
  const phoneRegex = /^(\+\d{1,3}[\s\-]?)?([0-9]|\(\d{1,4}\))[\d\s\-]{5,}$/;
  const cleanedPhone = String(value).replace(/[\s\-\(\)]/g, "");
  const digitCount = cleanedPhone.replace(/\D/g, "").length;

  if (!phoneRegex.test(String(value)) || digitCount < 7 || digitCount > 15) {
    return { ok: false, message: "phone" };
  }
  return true;
};

// Credit card validation (Luhn algorithm)
export const creditCardRule: RuleFn = (value) => {
  if (!value) return true;

  const str = String(value).replace(/\s+/g, "");
  if (!/^\d+$/.test(str)) {
    return { ok: false, message: "credit_card" };
  }

  let sum = 0;
  let isEven = false;

  for (let i = str.length - 1; i >= 0; i--) {
    let digit = parseInt(str.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  if (sum % 10 !== 0) {
    return { ok: false, message: "credit_card" };
  }

  return true;
};

// Array normalization rules
export const imagesRule: RuleFn = async (value: any) => {
  if (value === undefined || value === null || value === "") return true;

  try {
    if (Array.isArray(value)) return { ok: true, value };
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) || typeof parsed === "object") {
          return { ok: true, value: parsed };
        }
      } catch {}

      if (value.includes(",")) {
        return {
          ok: true,
          value: value
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
        };
      }
      return { ok: true, value: [value] };
    }
    if (typeof value === "object") return { ok: true, value };
    return { ok: true, value: [String(value)] };
  } catch (e) {
    return { ok: false, message: "invalid_images" };
  }
};

export const amenitiesRule: RuleFn = async (value: any) => {
  if (value === undefined || value === null || value === "") return true;

  try {
    if (Array.isArray(value) || typeof value === "object") return { ok: true, value };
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) || typeof parsed === "object") {
          return { ok: true, value: parsed };
        }
      } catch {}

      if (value.includes(",")) {
        return {
          ok: true,
          value: value
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
        };
      }
      return { ok: true, value: [value] };
    }
    return { ok: true, value: [String(value)] };
  } catch (e) {
    return { ok: false, message: "invalid_amenities" };
  }
};

// Nested object validation
export const nestedRule =
  (rules: Record<string, RuleSpec>): RuleFn =>
  async (value, field, payload) => {
    if (value === undefined || value === null) return true;

    if (typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, message: "object" };
    }

    try {
      await validate(value, rules);
      return true;
    } catch (error) {
      return { ok: false, message: "nested_validation_failed" };
    }
  };

// Array of objects validation
export const arrayOfObjectsRule =
  (rules: Record<string, RuleSpec>): RuleFn =>
  async (value, field, payload) => {
    if (value === undefined || value === null) return true;

    let array: any[];
    if (Array.isArray(value)) {
      array = value;
    } else if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        array = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return { ok: false, message: "array" };
      }
    } else {
      array = [value];
    }

    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      if (typeof item !== "object" || Array.isArray(item)) {
        return { ok: false, message: "object_array" };
      }

      try {
        await validate(item, rules);
      } catch (error) {
        return { ok: false, message: `items[${i}].validation_failed` };
      }
    }

    return { ok: true, value: array };
  };

// Export utility functions for external use
export { formatMessage, resolveMessage };
