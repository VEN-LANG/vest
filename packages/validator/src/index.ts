import { Model } from "@lara-node/db";

export class ValidationError extends Error {
  errors: Record<string, string[]>;
  messages: Record<string, string[]>;
  message: string;

  constructor(errors: Record<string, string[]>, messages?: Record<string, string[]>) {
    super("Validation failed");
    this.errors = errors;
    this.messages = messages || {};
    this.message = "unknown error";
    const totalErrors = Object.values(this.messages).reduce(
      (sum, currentArray) => sum + currentArray.length,
      0,
    );
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

const defaultMessages: Record<string, string> = {
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
  "min.numeric": ":attribute must be at least :min.",
  "min.string": ":attribute must be at least :min characters.",
  "min.array": ":attribute must have at least :min items.",
  "max.numeric": ":attribute may not be greater than :max.",
  "max.string": ":attribute may not be greater than :max characters.",
  "max.array": ":attribute may not have more than :max items.",
  "size.string": ":attribute must be exactly :size characters.",
  "size.array": ":attribute must contain exactly :size items.",
  "size.numeric": ":attribute must be exactly :size.",
  "between.numeric": ":attribute must be between :min and :max.",
  "between.string": ":attribute must be between :min and :max characters.",
  "between.array": ":attribute must have between :min and :max items.",
  regex: ":attribute format is invalid.",
  regex_invalid: "Invalid regex pattern for :attribute validation.",
  phone: ":attribute must be a valid phone number.",
  credit_card: ":attribute must be a valid credit card number.",
  in: ":attribute must be one of: :values.",
  not_in: ":attribute must not be one of: :values.",
  exists: "Selected :attribute is invalid.",
  unique: ":attribute has already been taken.",
  starts_with: ":attribute must start with one of: :prefixes.",
  ends_with: ":attribute must end with one of: :suffixes.",
  contains: ":attribute must contain :substring.",
  accepted: ":attribute must be accepted.",
  declined: ":attribute must be declined.",
  confirmed: ":attribute confirmation does not match.",
  different: ":attribute and :other must be different.",
  same: ":attribute and :other must be the same.",
  gt: ":attribute must be greater than :field.",
  gte: ":attribute must be greater than or equal to :field.",
  lt: ":attribute must be less than :field.",
  lte: ":attribute must be less than or equal to :field.",
  before: ":attribute must be a date before :field.",
  before_or_equal: ":attribute must be a date before or equal to :field.",
  after: ":attribute must be a date after :field.",
  after_or_equal: ":attribute must be a date after or equal to :field.",
  date_equals: ":attribute must be the same date as :field.",
  date_format: ":attribute does not match the format :format.",
  time: ":attribute must be a valid time (HH:MM or HH:MM:SS).",
  datetime: ":attribute must be a valid date and time.",
  timezone: ":attribute must be a valid timezone.",
  file: ":attribute must be a file.",
  mimes: ":attribute must be a file of type: :values.",
  max_file_size: ":attribute may not be larger than :max MB.",
  required_if: ":attribute is required.",
  required_unless: ":attribute is required.",
  required_with: ":attribute is required when :values is present.",
  required_with_all: ":attribute is required when :values are all present.",
  required_without: ":attribute is required when :values is not present.",
  required_without_all: ":attribute is required when none of :values are present.",
  present: ":attribute field must be present.",
  invalid: ":attribute is invalid.",
  nested_validation_failed: ":attribute contains invalid data.",
  object_array: ":attribute must be an array of objects.",
};

function parseDate(val: any): Date | null {
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const str = String(val).trim();
  const patterns: Array<{ re: RegExp; y: number; m: number; d: number }> = [
    { re: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, y: 3, m: 2, d: 1 },
    { re: /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/, y: 3, m: 2, d: 1 },
    { re: /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/, y: 3, m: 2, d: 1 },
    { re: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, y: 1, m: 2, d: 3 },
    { re: /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/, y: 1, m: 2, d: 3 },
  ];
  for (const { re, y, m, d } of patterns) {
    const match = str.match(re);
    if (match) {
      let year = parseInt(match[y], 10);
      if (year < 100) year += year < 70 ? 2000 : 1900;
      const month = parseInt(match[m], 10) - 1;
      const day = parseInt(match[d], 10);
      const dt = new Date(year, month, day);
      if (!isNaN(dt.getTime()) && dt.getMonth() === month) return dt;
    }
  }
  const native = new Date(str);
  if (!isNaN(native.getTime())) return native;
  return null;
}

export function formatMessage(template: string, ctx: Record<string, any>): string {
  return template.replace(/:([a-zA-Z_]+)/g, (_, key) =>
    ctx[key] !== undefined ? String(ctx[key]) : ":" + key,
  );
}

export function resolveMessage(
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
    if (defaultMessages[c]) return formatMessage(defaultMessages[c], { ...meta, attribute: attrLabel });
  }
  return formatMessage(defaultMessages.invalid || "Invalid value", { ...meta, attribute: attrLabel });
}

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

  function normalizePattern(p: string) {
    return p
      .replace(/\.\.+/g, ".*")
      .replace(/(^|\.)\*(\.|$)/g, (_, a, b) => "*" + (b ? "." : ""))
      .replace(/\.\*/g, ".*");
  }

  function splitSegments(pattern: string) {
    return pattern.split(".").map((s) => (s === "" ? "*" : s));
  }

  function getAtPath(obj: any, path: string) {
    if (!obj) return undefined;
    const segs = path.split(".");
    let cur = obj;
    for (const s of segs) {
      if (cur === undefined || cur === null) return undefined;
      if (/^\d+$/.test(s)) {
        cur = cur[Number(s)];
      } else {
        cur = cur[s];
      }
    }
    return cur;
  }

  function setAtPath(obj: any, path: string, value: any) {
    const segs = path.split(".");
    let cur = obj;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const isLast = i === segs.length - 1;
      const numeric = /^\d+$/.test(s);
      const key: any = numeric ? Number(s) : s;
      if (isLast) { cur[key] = value; return; }
      if (cur[key] === undefined || cur[key] === null) {
        const nextSeg = segs[i + 1];
        cur[key] = /^\d+$/.test(nextSeg) ? [] : {};
      }
      cur = cur[key];
    }
  }

  function expandFieldPaths(obj: any, pattern: string): string[] {
    if (!pattern) return [];
    const normalized = normalizePattern(pattern);
    const segs = splitSegments(normalized);
    const results: string[] = [];

    function recurse(current: any, idx: number, prefix: string) {
      if (idx >= segs.length) { results.push(prefix.replace(/^\./, "")); return; }
      const seg = segs[idx];
      if (seg === "*" || seg === "") {
        if (Array.isArray(current)) {
          for (let i = 0; i < current.length; i++) recurse(current[i], idx + 1, prefix + "." + i);
        } else if (current && typeof current === "object") {
          for (const k of Object.keys(current)) recurse(current[k], idx + 1, prefix + "." + k);
        } else {
          const parentPath = prefix.replace(/^\./, "");
          let parentVal: any = undefined;
          try { parentVal = parentPath ? getAtPath(obj, parentPath) : obj; } catch { parentVal = undefined; }
          if (typeof parentVal === "string") {
            try {
              const parsed = JSON.parse(parentVal);
              if (Array.isArray(parsed)) {
                for (let i = 0; i < parsed.length; i++) recurse(parsed[i], idx + 1, prefix + "." + i);
                return;
              }
            } catch {}
            if (parentVal.includes(",")) {
              const parts = parentVal.split(",").map((s: string) => s.trim()).filter(Boolean);
              for (let i = 0; i < parts.length; i++) recurse(parts[i], idx + 1, prefix + "." + i);
              return;
            }
          }
          recurse(undefined, idx + 1, prefix + ".*");
        }
      } else {
        if (current && (typeof current === "object" || Array.isArray(current)) && seg in current) {
          recurse(current[seg], idx + 1, prefix + "." + seg);
        } else if (current && Array.isArray(current) && /^\d+$/.test(seg)) {
          recurse(current[Number(seg)], idx + 1, prefix + "." + seg);
        } else {
          recurse(undefined, idx + 1, prefix + "." + seg);
        }
      }
    }

    recurse(obj, 0, "");
    if (results.length === 0) {
      if (!pattern.includes("*")) return [pattern];
      return [];
    }
    return Array.from(new Set(results));
  }

  for (const fieldPattern of Object.keys(rules)) {
    const spec = rules[fieldPattern];
    let fieldRule: string | RuleFn;

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

    const targetPaths = expandFieldPaths(out, fieldPattern);
    if (fieldPattern.includes("*") && targetPaths.length === 0) continue;

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
            const parts = parentVal.split(",").map((s: string) => s.trim()).filter(Boolean);
            for (let i = 0; i < parts.length; i++) pathsToValidate.push(`${parentPath}.${i}`);
            continue;
          }
        }
        pathsToValidate.push(tp);
      } else {
        pathsToValidate.push(tp);
      }
    }

    for (const field of pathsToValidate) {
      const raw = getAtPath(out, field);

      if (typeof fieldRule === "function") {
        const res = await (fieldRule as RuleFn)(raw, field, out);
        if (res === true) continue;
        if (res === false) { pushError(field, "invalid", { value: raw, kind: typeof raw }); continue; }
        if (res && (res as any).ok === false) {
          pushError(field, (res as any).message || "invalid", { value: raw, kind: typeof raw });
          continue;
        }
        if (res && (res as any).ok === true && "value" in (res as any)) {
          setAtPath(out, field, (res as any).value);
          continue;
        }
        continue;
      }

      const parts = String(fieldRule).split("|").map((s) => s.trim()).filter(Boolean);
      const isRequired = parts.includes("required");
      const isNullable = parts.includes("nullable");
      const isSometimes = parts.includes("sometimes");
      const isPresent = parts.includes("present");
      const present = raw !== undefined && raw !== null && raw !== "";

      let conditionalRequired = false;
      for (const p of parts) {
        if (p.startsWith("required_if:")) {
          const [condField, ...values] = p.slice("required_if:".length).split(",").map((s) => s.trim());
          if (values.some((v) => v === String(getAtPath(out, condField) ?? ""))) conditionalRequired = true;
        } else if (p.startsWith("required_unless:")) {
          const [condField, ...values] = p.slice("required_unless:".length).split(",").map((s) => s.trim());
          if (!values.some((v) => v === String(getAtPath(out, condField) ?? ""))) conditionalRequired = true;
        } else if (p.startsWith("required_with:")) {
          const fields = p.slice("required_with:".length).split(",").map((s) => s.trim());
          if (fields.some((f) => { const v = getAtPath(out, f); return v !== undefined && v !== null && v !== ""; })) conditionalRequired = true;
        } else if (p.startsWith("required_with_all:")) {
          const fields = p.slice("required_with_all:".length).split(",").map((s) => s.trim());
          if (fields.every((f) => { const v = getAtPath(out, f); return v !== undefined && v !== null && v !== ""; })) conditionalRequired = true;
        } else if (p.startsWith("required_without:")) {
          const fields = p.slice("required_without:".length).split(",").map((s) => s.trim());
          if (fields.some((f) => { const v = getAtPath(out, f); return v === undefined || v === null || v === ""; })) conditionalRequired = true;
        } else if (p.startsWith("required_without_all:")) {
          const fields = p.slice("required_without_all:".length).split(",").map((s) => s.trim());
          if (fields.every((f) => { const v = getAtPath(out, f); return v === undefined || v === null || v === ""; })) conditionalRequired = true;
        }
      }

      const effectiveRequired = isRequired || conditionalRequired;
      if (isSometimes && !present) continue;
      if (isPresent && raw === undefined) { pushError(field, "present", { value: raw }); continue; }
      if (effectiveRequired && !present) { pushError(field, "required", { value: raw }); continue; }
      if (!present && (isNullable || !effectiveRequired)) continue;

      let val: any = raw;
      let failed = false;

      for (const p of parts) {
        if (["required", "nullable", "sometimes", "present"].includes(p)) continue;
        if (p.startsWith("required_if:") || p.startsWith("required_unless:") ||
          p.startsWith("required_with:") || p.startsWith("required_with_all:") ||
          p.startsWith("required_without:") || p.startsWith("required_without_all:")) continue;
        if (failed) break;

        switch (true) {
          case p === "string":
            if (typeof val !== "string") val = String(val);
            break;
          case p === "email": {
            if (typeof val !== "string") val = String(val);
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { pushError(field, "email", { value: val, kind: "string" }); failed = true; }
            break;
          }
          case p === "int" || p === "integer": {
            const intVal = parseInt(val, 10);
            if (Number.isNaN(intVal)) { pushError(field, "integer", { value: val, kind: typeof val }); failed = true; } else val = intVal;
            break;
          }
          case p === "numeric" || p === "float" || p === "double": {
            const numVal = Number(val);
            if (Number.isNaN(numVal)) { pushError(field, "numeric", { value: val, kind: typeof val }); failed = true; } else val = numVal;
            break;
          }
          case p === "boolean":
            if (typeof val === "string") {
              const lv = val.toLowerCase();
              if (["true", "1", "yes", "on"].includes(lv)) val = true;
              else if (["false", "0", "no", "off"].includes(lv)) val = false;
              else { pushError(field, "boolean", { value: val, kind: typeof val }); failed = true; }
            } else if (typeof val !== "boolean") { pushError(field, "boolean", { value: val, kind: typeof val }); failed = true; }
            break;
          case p === "array":
            if (!Array.isArray(val)) {
              if (typeof val === "string") {
                try { const p2 = JSON.parse(val); if (Array.isArray(p2)) val = p2; else { pushError(field, "array", { value: val, kind: typeof val }); failed = true; } }
                catch { pushError(field, "array", { value: val, kind: typeof val }); failed = true; }
              } else { pushError(field, "array", { value: val, kind: typeof val }); failed = true; }
            }
            break;
          case p === "json":
            if (typeof val === "string") {
              try { val = JSON.parse(val); } catch { pushError(field, "json", { value: val, kind: typeof val }); failed = true; }
            }
            break;
          case p === "date": {
            const date = parseDate(val);
            if (!date) { pushError(field, "date", { value: val, kind: typeof val }); failed = true; } else val = date;
            break;
          }
          case p === "url":
            try { new URL(val); } catch { pushError(field, "url", { value: val, kind: typeof val }); failed = true; }
            break;
          case p === "uuid":
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(val))) {
              pushError(field, "uuid", { value: val, kind: typeof val }); failed = true;
            }
            break;
          case p === "phone": {
            const phoneRegex = /^(\+\d{1,3}[\s-]?)?([0-9]|\(\d{1,4}\))[\d\s-]{5,}$/;
            const cleaned = String(val).replace(/[\s\-()]/g, "");
            const dc = cleaned.replace(/\D/g, "").length;
            if (!phoneRegex.test(String(val)) || dc < 7 || dc > 15) { pushError(field, "phone", { value: val, kind: typeof val }); failed = true; }
            break;
          }
          case p.startsWith("min:"): await handleMinRule(field, val, p); break;
          case p.startsWith("max:"): await handleMaxRule(field, val, p); break;
          case p.startsWith("size:"): await handleSizeRule(field, val, p); break;
          case p.startsWith("between:"): await handleBetweenRule(field, val, p); break;
          case p.startsWith("in:"): await handleInRule(field, val, p); break;
          case p.startsWith("not_in:"): await handleNotInRule(field, val, p); break;
          case p.startsWith("exists:"):
            if (!((raw === undefined || raw === null || raw === "") && parts.includes("nullable"))) await handleExistsRule(field, val, p);
            break;
          case p.startsWith("unique:"): await handleUniqueRule(field, val, p); break;
          case p.startsWith("regex:"): await handleRegexRule(field, val, p); break;
          case p.startsWith("starts_with:"): await handleStartsWithRule(field, val, p); break;
          case p.startsWith("ends_with:"): await handleEndsWithRule(field, val, p); break;
          case p.startsWith("contains:"): await handleContainsRule(field, val, p); break;
          case p.startsWith("gt:"): await handleComparisonRule(field, val, p, "gt", out); break;
          case p.startsWith("gte:"): await handleComparisonRule(field, val, p, "gte", out); break;
          case p.startsWith("lt:"): await handleComparisonRule(field, val, p, "lt", out); break;
          case p.startsWith("lte:"): await handleComparisonRule(field, val, p, "lte", out); break;
          case p.startsWith("before:"): await handleDateComparisonRule(field, val, p, "before", out); break;
          case p.startsWith("before_or_equal:"): await handleDateComparisonRule(field, val, p, "before_or_equal", out); break;
          case p.startsWith("after:"): await handleDateComparisonRule(field, val, p, "after", out); break;
          case p.startsWith("after_or_equal:"): await handleDateComparisonRule(field, val, p, "after_or_equal", out); break;
          case p.startsWith("date_equals:"): await handleDateComparisonRule(field, val, p, "date_equals", out); break;
          case p.startsWith("date_format:"): await handleDateFormatRule(field, raw, p); break;
          case p === "time":
            if (typeof val !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(val)) { pushError(field, "time", { value: val }); failed = true; }
            break;
          case p === "datetime": {
            const dtVal = parseDate(val);
            if (!dtVal) { pushError(field, "datetime", { value: val }); failed = true; } else val = dtVal;
            break;
          }
          case p === "timezone":
            try { Intl.DateTimeFormat(undefined, { timeZone: String(val) }); }
            catch { pushError(field, "timezone", { value: val }); failed = true; }
            break;
          case p === "accepted":
            if (![true, 1, "1", "yes", "on"].includes(val)) { pushError(field, "accepted", { value: val }); failed = true; }
            break;
          case p === "declined":
            if (![false, 0, "0", "no", "off"].includes(val)) { pushError(field, "declined", { value: val }); failed = true; }
            break;
          case p === "confirmed": {
            const cf = `${field}_confirmation`;
            if (out && (out[cf] || out["confirmation_" + field] || out[field + "_confirmed"] || out["confirmed_" + field] || out["confirm_" + field]) !== val) {
              pushError(field, "confirmed", { other: cf }); failed = true;
            }
            break;
          }
          case p.startsWith("different:"): {
            const df = p.split(":")[1];
            if (out && out[df] === val) { pushError(field, "different", { other: df }); failed = true; }
            break;
          }
          case p.startsWith("same:"): {
            const sf = p.split(":")[1];
            if (out && out[sf] !== val) { pushError(field, "same", { other: sf }); failed = true; }
            break;
          }
          default: break;
        }
      }

      if (!failed) setAtPath(out, field, val);
    }
  }

  function pushError(field: string, code: string, meta: Record<string, any> = {}) {
    errors[field] = errors[field] || [];
    errors[field].push(code);
    metaErrors[field] = metaErrors[field] || [];
    metaErrors[field].push({ code, meta });
  }

  for (const field of Object.keys(metaErrors)) {
    for (const item of metaErrors[field]) {
      const merged = { ...(customMessages || {}), ...(fieldMessagesMap[field] || {}) };
      const msg = resolveMessage(field, item.code, item.meta, merged);
      messageErrors[field] = messageErrors[field] || [];
      messageErrors[field].push(msg);
    }
  }

  if (Object.keys(errors).length) throw new ValidationError(errors, messageErrors);
  return out as T;

  async function handleMinRule(field: string, val: any, rule: string) {
    const arg = Number(rule.split(":")[1]);
    if (typeof val === "number" && val < arg) pushError(field, "min", { min: arg, value: val, kind: "numeric" });
    else if (typeof val === "string" && val.length < arg) pushError(field, "min", { min: arg, value: val, kind: "string" });
    else if (Array.isArray(val) && val.length < arg) pushError(field, "min", { min: arg, value: val, kind: "array" });
  }

  async function handleMaxRule(field: string, val: any, rule: string) {
    const arg = Number(rule.split(":")[1]);
    if (typeof val === "number" && val > arg) pushError(field, "max", { max: arg, value: val, kind: "numeric" });
    else if (typeof val === "string" && val.length > arg) pushError(field, "max", { max: arg, value: val, kind: "string" });
    else if (Array.isArray(val) && val.length > arg) pushError(field, "max", { max: arg, value: val, kind: "array" });
  }

  async function handleSizeRule(field: string, val: any, rule: string) {
    const arg = Number(rule.split(":")[1]);
    if (typeof val === "number" && val !== arg) pushError(field, "size", { size: arg, value: val, kind: "numeric" });
    else if (typeof val === "string" && val.length !== arg) pushError(field, "size", { size: arg, value: val, kind: "string" });
    else if (Array.isArray(val) && val.length !== arg) pushError(field, "size", { size: arg, value: val, kind: "array" });
  }

  async function handleBetweenRule(field: string, val: any, rule: string) {
    const [min, max] = rule.split(":")[1].split(",").map(Number);
    if (typeof val === "number" && (val < min || val > max)) pushError(field, "between", { min, max, value: val, kind: "numeric" });
    else if (typeof val === "string" && (val.length < min || val.length > max)) pushError(field, "between", { min, max, value: val, kind: "string" });
    else if (Array.isArray(val) && (val.length < min || val.length > max)) pushError(field, "between", { min, max, value: val, kind: "array" });
  }

  async function handleInRule(field: string, val: any, rule: string) {
    const opts = rule.split(":")[1].split(",").map((s) => s.trim());
    if (!opts.includes(String(val))) pushError(field, "in", { value: val, values: opts.join(", ") });
  }

  async function handleNotInRule(field: string, val: any, rule: string) {
    const opts = rule.split(":")[1].split(",").map((s) => s.trim());
    if (opts.includes(String(val))) pushError(field, "not_in", { value: val, values: opts.join(", ") });
  }

  async function handleExistsRule(field: string, val: any, rule: string) {
    try {
      const spec = rule.split(":")[1];
      let [table, column] = spec.split(",");
      table = (table || "").trim(); column = (column || "id").trim();
      class VM extends Model { static table = table; static primaryKey = "id"; static fillable = [column]; }
      const exists = await VM.query().where(column, "=", val).exists();
      if (!exists) pushError(field, "exists", { value: val, table, column });
    } catch { pushError(field, "exists", { value: val }); }
  }

  async function handleUniqueRule(field: string, val: any, rule: string) {
    try {
      const spec = rule.split(":")[1];
      const partsSpec = spec.split(",").map((s) => s.trim());
      const table = partsSpec[0];
      const column = partsSpec[1] || "id";
      const exceptArg = partsSpec[2]; const exceptArg2 = partsSpec[3];
      class VM extends Model { static table = table; static primaryKey = "id"; static fillable = [column]; }
      let exceptColumn = VM.primaryKey, exceptValue = exceptArg;
      if (exceptArg2 !== undefined) { exceptColumn = exceptArg; exceptValue = exceptArg2; }
      let q = VM.query().where(column, "=", val);
      if (exceptValue !== undefined && exceptValue !== null && String(exceptValue) !== "") {
        q = q.where(function (query: any) { query.where(exceptColumn, "!=", exceptValue); });
      }
      if (await q.exists()) pushError(field, "unique", { value: val, table, column });
    } catch { pushError(field, "unique", { value: val }); }
  }

  async function handleRegexRule(field: string, val: any, rule: string) {
    const pattern = rule.split(":")[1];
    try {
      if (!new RegExp(pattern).test(String(val))) pushError(field, "regex", { value: val, pattern });
    } catch { pushError(field, "regex_invalid", { value: val, pattern }); }
  }

  async function handleStartsWithRule(field: string, val: any, rule: string) {
    const prefixes = rule.split(":")[1].split(",").map((s) => s.trim());
    if (!prefixes.some((p2) => String(val).startsWith(p2))) pushError(field, "starts_with", { value: val, prefixes: prefixes.join(", ") });
  }

  async function handleEndsWithRule(field: string, val: any, rule: string) {
    const suffixes = rule.split(":")[1].split(",").map((s) => s.trim());
    if (!suffixes.some((s) => String(val).endsWith(s))) pushError(field, "ends_with", { value: val, suffixes: suffixes.join(", ") });
  }

  async function handleContainsRule(field: string, val: any, rule: string) {
    const substring = rule.split(":")[1];
    if (!String(val).includes(substring)) pushError(field, "contains", { value: val, substring });
  }

  async function handleComparisonRule(field: string, val: any, rule: string, operator: string, payload: any) {
    const otherField = rule.split(":")[1];
    const otherValue = payload ? getAtPath(payload, otherField) : undefined;
    if (otherValue === undefined) return;
    const numVal = Number(val), numOther = Number(otherValue);
    if (!isNaN(numVal) && !isNaN(numOther)) {
      const ok = operator === "gt" ? numVal > numOther : operator === "gte" ? numVal >= numOther : operator === "lt" ? numVal < numOther : numVal <= numOther;
      if (!ok) pushError(field, operator, { field: otherField, value: val, other: otherValue });
      return;
    }
    const dv = parseDate(val), dOther = parseDate(otherValue);
    if (dv && dOther) {
      const tv = dv.getTime(), to = dOther.getTime();
      const ok = operator === "gt" ? tv > to : operator === "gte" ? tv >= to : operator === "lt" ? tv < to : tv <= to;
      if (!ok) pushError(field, operator, { field: otherField, value: val, other: otherValue });
      return;
    }
    const sv = String(val), so = String(otherValue);
    const ok = operator === "gt" ? sv > so : operator === "gte" ? sv >= so : operator === "lt" ? sv < so : sv <= so;
    if (!ok) pushError(field, operator, { field: otherField, value: val, other: otherValue });
  }

  async function handleDateComparisonRule(field: string, val: any, rule: string, operator: string, payload: any) {
    const otherField = rule.split(":")[1];
    let otherRaw = payload ? getAtPath(payload, otherField) : undefined;
    if (otherRaw === undefined) otherRaw = otherField;
    if (typeof otherRaw === "string") {
      const lower = otherRaw.toLowerCase().trim();
      if (lower === "today") { const t = new Date(); t.setHours(0,0,0,0); otherRaw = t; }
      else if (lower === "yesterday") { const t = new Date(); t.setDate(t.getDate()-1); t.setHours(0,0,0,0); otherRaw = t; }
      else if (lower === "tomorrow") { const t = new Date(); t.setDate(t.getDate()+1); t.setHours(0,0,0,0); otherRaw = t; }
      else {
        const rm = lower.match(/^(today|yesterday|tomorrow|now)([+-])(\d+)(days?|weeks?|months?|years?)$/);
        if (rm) {
          const [, anchor, sign, numStr, unit] = rm;
          const n = parseInt(numStr, 10) * (sign === "+" ? 1 : -1);
          const t = new Date(); t.setHours(0,0,0,0);
          if (anchor === "yesterday") t.setDate(t.getDate()-1);
          if (anchor === "tomorrow") t.setDate(t.getDate()+1);
          if (unit.startsWith("day")) t.setDate(t.getDate()+n);
          if (unit.startsWith("week")) t.setDate(t.getDate()+n*7);
          if (unit.startsWith("month")) t.setMonth(t.getMonth()+n);
          if (unit.startsWith("year")) t.setFullYear(t.getFullYear()+n);
          otherRaw = t;
        }
      }
    }
    const dv = parseDate(val), dOther = parseDate(otherRaw);
    if (!dv) { pushError(field, "date", { value: val }); return; }
    if (!dOther) return;
    const tv = dv.getTime(), to = dOther.getTime();
    const ok = operator === "before" ? tv < to : operator === "before_or_equal" ? tv <= to : operator === "after" ? tv > to : operator === "after_or_equal" ? tv >= to : tv === to;
    if (!ok) pushError(field, operator, { field: otherField, value: val, other: otherRaw });
  }

  async function handleDateFormatRule(field: string, val: any, rule: string) {
    const format = rule.slice("date_format:".length);
    const strVal = String(val);
    const tokenMap: Record<string, string> = {
      YYYY: "\\d{4}", YY: "\\d{2}", MM: "(?:0[1-9]|1[0-2])", DD: "(?:0[1-9]|[12]\\d|3[01])",
      HH: "(?:[01]\\d|2[0-3])", mm: "[0-5]\\d", ss: "[0-5]\\d", SSS: "\\d{3}", Z: "(?:Z|[+-]\\d{2}:\\d{2})",
    };
    let pattern = format.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const token of Object.keys(tokenMap).sort((a, b) => b.length - a.length)) {
      pattern = pattern.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), tokenMap[token]);
    }
    if (!new RegExp("^" + pattern + "$").test(strVal)) pushError(field, "date_format", { value: val, format });
  }
}

export const requiredIf =
  (otherField: string, value: any): RuleFn =>
    async (val, _field, payload) => {
      if (payload && payload[otherField] === value) {
        if (val === undefined || val === null || val === "") return { ok: false, message: "required" };
      }
      return true;
    };

export const requiredUnless =
  (otherField: string, value: any): RuleFn =>
    async (val, _field, payload) => {
      if (payload && payload[otherField] !== value) {
        if (val === undefined || val === null || val === "") return { ok: false, message: "required" };
      }
      return true;
    };

export const fileRule: RuleFn = async (value) => {
  if (!value) return true;
  if (typeof value === "object" && (value instanceof File || ("name" in value && "size" in value))) return true;
  return { ok: false, message: "file" };
};

export const mimes =
  (allowedTypes: string[]): RuleFn =>
    async (value) => {
      if (!value) return true;
      let fileName = typeof value === "string" ? value : (value?.name || "");
      const extension = fileName.split(".").pop()?.toLowerCase() || "";
      const mimeTypes: Record<string, string[]> = {
        jpg: ["image/jpeg"], jpeg: ["image/jpeg"], png: ["image/png"],
        gif: ["image/gif"], pdf: ["application/pdf"],
        doc: ["application/msword"],
        docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      };
      const allowedExts = allowedTypes.map((type) => {
        for (const [ext, mimes2] of Object.entries(mimeTypes)) if (mimes2.includes(type)) return ext;
        return type.split("/").pop();
      }).filter(Boolean);
      if (!allowedExts.includes(extension)) return { ok: false, message: "mimes", value: allowedTypes.join(", ") };
      return true;
    };

export const maxFileSize =
  (maxSizeInMB: number): RuleFn =>
    async (value) => {
      if (!value) return true;
      const fileSize = value instanceof File ? value.size : (value?.size || 0);
      if (fileSize > maxSizeInMB * 1024 * 1024) return { ok: false, message: "max_file_size", value: maxSizeInMB };
      return true;
    };

export const phoneRule: RuleFn = (value) => {
  if (!value) return true;
  const phoneRegex = /^(\+\d{1,3}[\s-]?)?([0-9]|\(\d{1,4}\))[\d\s-]{5,}$/;
  const cleaned = String(value).replace(/[\s\-()]/g, "");
  const dc = cleaned.replace(/\D/g, "").length;
  if (!phoneRegex.test(String(value)) || dc < 7 || dc > 15) return { ok: false, message: "phone" };
  return true;
};

export const creditCardRule: RuleFn = (value) => {
  if (!value) return true;
  const str = String(value).replace(/\s+/g, "");
  if (!/^\d+$/.test(str)) return { ok: false, message: "credit_card" };
  let sum = 0, isEven = false;
  for (let i = str.length - 1; i >= 0; i--) {
    let digit = parseInt(str.charAt(i), 10);
    if (isEven) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit; isEven = !isEven;
  }
  if (sum % 10 !== 0) return { ok: false, message: "credit_card" };
  return true;
};

export const nestedRule =
  (rules: Record<string, RuleSpec>): RuleFn =>
    async (value) => {
      if (value === undefined || value === null) return true;
      if (typeof value !== "object" || Array.isArray(value)) return { ok: false, message: "object" };
      try { await validate(value, rules); return true; }
      catch { return { ok: false, message: "nested_validation_failed" }; }
    };

export const arrayOfObjectsRule =
  (rules: Record<string, RuleSpec>): RuleFn =>
    async (value) => {
      if (value === undefined || value === null) return true;
      let array: any[];
      if (Array.isArray(value)) array = value;
      else if (typeof value === "string") {
        try { const p = JSON.parse(value); array = Array.isArray(p) ? p : [p]; }
        catch { return { ok: false, message: "array" }; }
      } else array = [value];
      for (let i = 0; i < array.length; i++) {
        if (typeof array[i] !== "object" || Array.isArray(array[i])) return { ok: false, message: "object_array" };
        try { await validate(array[i], rules); }
        catch { return { ok: false, message: `items[${i}].validation_failed` }; }
      }
      return { ok: true, value: array };
    };
