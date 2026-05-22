import type { RuleSpec, RuleFn } from '@lara-node/validator';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number | string;
        email?: string;
        name?: string;
        roles?: string[];
        permissions?: string[];
        [key: string]: unknown;
      };
      validate: <T extends Record<string, unknown>>(
        payloadOrRules?: Record<string, string | RuleFn> | Record<string, unknown>,
        rulesMaybe?: Record<string, RuleSpec> | Record<string, string | RuleFn>,
        customMessages?: Record<string, string>,
      ) => Promise<T>;
    }
    interface Response {
      jsonAsync: <T>(data: T) => Promise<Response>;
    }
  }
}

export {};
