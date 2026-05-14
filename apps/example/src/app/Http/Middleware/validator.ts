import type { Request, Response, NextFunction } from "express";
import { RuleFn, RuleSpec, validate } from "@app/Helpers/validator";

declare global {
  namespace Express {
    interface Request {
      validate: <T extends Record<string, any>>(
        payloadOrRules?: any,
        rulesMaybe?: Record<string, RuleSpec> | Record<string, string | RuleFn>,
        customMessages?: Record<string, string>,
      ) => Promise<T>;
    }
  }
}

export default function validatorMiddleware(
  req: Request & { validate?: any },
  res: Response,
  next: NextFunction,
) {
  // attach an async validate method: req.validate(payloadOrRules?, rules?, customMessages?)
  req.validate = async function <T extends Record<string, any>>(
    payloadOrRules: any,
    maybeRules?: any,
    customMessages?: Record<string, string>,
  ): Promise<T> {
    let payload = undefined as any;
    let rules = undefined as any;
    if (
      maybeRules === undefined &&
      typeof payloadOrRules === "object" &&
      !Array.isArray(payloadOrRules) &&
      Object.keys(payloadOrRules || {}).length &&
      Object.values(payloadOrRules).every(
        (v) =>
          typeof v === "string" ||
          typeof v === "function" ||
          (typeof v === "object" && v && "rule" in v),
      )
    ) {
      rules = payloadOrRules;
      payload =
        (req as any).body && (req as any).body.payload
          ? (req as any).body.payload
          : (req as any).body;
    } else if (maybeRules === undefined && typeof payloadOrRules === "string") {
      throw new Error(
        "Invalid validate invocation. Use req.validate(payload, rules, customMessages) or req.validate(rules, customMessages)",
      );
    } else if (maybeRules !== undefined) {
      payload = payloadOrRules;
      rules = maybeRules;
    } else {
      payload =
        payloadOrRules ||
        ((req as any).body && (req as any).body.payload
          ? (req as any).body.payload
          : (req as any).body);
      rules = maybeRules;
    }

    if (!rules) throw new Error("No validation rules provided");
    return await validate<T>(payload, rules, customMessages);
  };
  next();
}
