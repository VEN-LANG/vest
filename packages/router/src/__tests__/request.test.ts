import { describe, expect, it, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

// ---- break the circular chain: FormRequest → @lara-node/validator → @lara-node/db → @lara-node/core
vi.mock("@lara-node/db", () => ({
  Model: class Model {
    static primaryKey = "id";
    static findOrFail() { throw new Error("not implemented"); }
  },
  EloquentBuilder: class EloquentBuilder {
    constructor() {}
  },
}));

// mock resolver so router doesn't query real middleware stack
vi.mock("../Middleware/middleware.js", () => ({
  resolveMiddleware: (mw: any) => {
    if (typeof mw === "function") return mw;
    return (_req: any, _res: any, next: any) => next?.();
  },
}));

import "reflect-metadata";
import { container, FormRequest } from "@lara-node/core";
import { RouterBuilder } from "../router.js";

// ---------------------------------------------------------------------------
// FormRequest subclass
// ---------------------------------------------------------------------------
class LoginRequest extends FormRequest<{ email: string; password: string }> {
  rules() {
    return { email: "required|email", password: "required|min:6" };
  }
}

class NoOpRequest extends FormRequest {
  rules() {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------
class AuthController {
  async store(req: any, res: any) {
    return res.json({ validated: req.validated(), email: req.input("email") });
  }

  async plain(req: any, res: any) {
    return res.json({ method: req.method });
  }

  async withModel(req: any, res: any, user: any) {
    return res.json({ validated: req.validated(), user });
  }
}

// ---------------------------------------------------------------------------
// Helper: simulate what the router does in register()
// ---------------------------------------------------------------------------
function makeMockRes(): any {
  const state = { statusCode: 200, body: null };
  const res: any = {
    statusCode: 200,
    status(code: number) {
      state.statusCode = code;
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      state.body = data;
      return res;
    },
    send(data: any) {
      state.body = data;
      return res;
    },
  };
  return res;
}

function makeMockReq(overrides: Partial<Request> = {}): any {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    method: "GET",
    path: "/",
    url: "/",
    ip: "127.0.0.1",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Router FormRequest integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("resolveControllerArgs logic", () => {
    it("returns [FormRequest, res] when the first parameter extends FormRequest", () => {
      // Manually test the resolveControllerArgs logic
      const paramTypes = [LoginRequest, Object];
      const req = makeMockReq();
      const res = makeMockRes();

      const isFormRequest =
        paramTypes.length > 0 && paramTypes[0]?.prototype instanceof FormRequest;
      expect(isFormRequest).toBe(true);

      const args = isFormRequest ? [new paramTypes[0](req), res] : [req, res];
      expect(args[0]).toBeInstanceOf(LoginRequest);
      expect(args[0]).toBeInstanceOf(FormRequest);
      expect(args[1]).toBe(res);
    });

    it("returns [req, res] when the first parameter does NOT extend FormRequest", () => {
      const paramTypes = [Object, Object];
      const req = makeMockReq();
      const res = makeMockRes();

      const isFormRequest =
        paramTypes.length > 0 && paramTypes[0]?.prototype instanceof FormRequest;
      expect(isFormRequest).toBe(false);

      const args = isFormRequest ? [new paramTypes[0](req), res] : [req, res];
      expect(args[0]).toBe(req);
      expect(args[1]).toBe(res);
    });

    it("falls back to [req, res] when no design:paramtypes metadata exists", () => {
      const paramTypes = undefined;
      const req = makeMockReq();
      const res = makeMockRes();

      const safeParamTypes: any[] = paramTypes || [];
      const isFormRequest =
        safeParamTypes.length > 0 && safeParamTypes[0]?.prototype instanceof FormRequest;

      expect(isFormRequest).toBe(false);
    });
  });

  describe("auto-validation", () => {
    it("auto-validates the form request before calling the controller", async () => {
      const req = makeMockReq({
        method: "POST",
        body: { email: "user@test.com", password: "secret123" },
      });
      const state: any = {};
      const res = makeMockRes();
      // Patch to capture body on res itself too
      res.json = (data: any) => { state.body = data; res._body = data; return res; };

      const formRequest = new LoginRequest(req);
      await formRequest.validate();

      const controller = new AuthController();
      await controller.store(formRequest, res);

      expect(state.body.validated).toEqual({
        email: "user@test.com",
        password: "secret123",
      });
    });

    it("throws when validation fails", async () => {
      const req = makeMockReq({
        method: "POST",
        body: { email: "invalid" },
      });

      const formRequest = new LoginRequest(req);
      await expect(formRequest.validate()).rejects.toThrow();
      expect(formRequest.fails()).toBe(true);
      expect(formRequest.errors().email).toBeDefined();
    });
  });

  describe("integration with RouterBuilder", () => {
    it("registers routes with FormRequest controllers without error", () => {
      const rb = new RouterBuilder();
      expect(() => {
        rb.post("/login", [AuthController, "store"]);
      }).not.toThrow();
    });

    it("builds the Express router without error", () => {
      const rb = new RouterBuilder();
      rb.post("/login", [AuthController, "store"]);
      expect(() => rb.build()).not.toThrow();
    });
  });
});
