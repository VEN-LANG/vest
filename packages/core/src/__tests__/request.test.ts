import { describe, expect, it, vi } from "vitest";
import { Request as ExpressRequest } from "express";

const mockValidate = vi.fn();
const mockValidationError = vi.fn(function (this: any, errors: any, messages: any) {
  this.errors = errors;
  this.messages = messages;
  this.message = Object.values(messages).flat()[0] || "Validation failed";
  Object.setPrototypeOf(this, mockValidationError.prototype);
});
mockValidationError.prototype = Object.create(Error.prototype);

vi.mock("@lara-node/validator", () => ({
  validate: (...args: any[]) => mockValidate(...args),
  ValidationError: mockValidationError as any,
}));

// Import AFTER mocks
const { FormRequest } = await import("../Request.js");

function createMockReq(overrides: Partial<ExpressRequest> = {}): ExpressRequest {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    ip: "127.0.0.1",
    method: "POST",
    path: "/test",
    url: "/test",
    originalUrl: "/test",
    get: vi.fn(),
    header: vi.fn(),
    accepts: vi.fn(),
    ...overrides,
  } as any;
}

describe("FormRequest base class", () => {
  beforeEach(() => {
    mockValidate.mockReset();
  });

  describe("subclass definition", () => {
    it("can be extended with rules", () => {
      class TestRequest extends FormRequest {
        rules() {
          return { name: "required|string" };
        }
      }
      const req = createMockReq();
      const instance = new TestRequest(req);
      expect(instance.rules()).toEqual({ name: "required|string" });
    });
  });

  describe("rules()", () => {
    it("returns the validation rules defined by the subclass", () => {
      class LoginRequest extends FormRequest {
        rules() {
          return { email: "required|email", password: "required" };
        }
      }
      const req = createMockReq();
      const instance = new LoginRequest(req);
      expect(instance.rules()).toEqual({
        email: "required|email",
        password: "required",
      });
    });
  });

  describe("authorize()", () => {
    it("defaults to true", () => {
      class TestRequest extends FormRequest {
        rules() {
          return {};
        }
      }
      const instance = new TestRequest(createMockReq());
      expect(instance.authorize()).toBe(true);
    });

    it("can be overridden to return false", () => {
      class AdminRequest extends FormRequest {
        rules() {
          return {};
        }
        authorize() {
          return false;
        }
      }
      const instance = new AdminRequest(createMockReq());
      expect(instance.authorize()).toBe(false);
    });
  });

  describe("messages()", () => {
    it("defaults to empty object", () => {
      class TestRequest extends FormRequest {
        rules() {
          return {};
        }
      }
      const instance = new TestRequest(createMockReq());
      expect(instance.messages()).toEqual({});
    });
  });

  describe("validate()", () => {
    it("throws ValidationError when authorize returns false", async () => {
      class ProtectedRequest extends FormRequest {
        rules() {
          return {};
        }
        authorize() {
          return false;
        }
      }
      const instance = new ProtectedRequest(createMockReq());
      await expect(instance.validate()).rejects.toThrow();
    });

    it("calls the validator with body, query, and params merged", async () => {
      class TestRequest extends FormRequest {
        rules() {
          return { email: "required|email" };
        }
      }

      mockValidate.mockResolvedValue({ email: "test@example.com" });

      const req = createMockReq({
        body: { email: "test@example.com" },
        query: { ref: "homepage" },
        params: { id: "123" },
      });
      const instance = new TestRequest(req);
      await instance.validate();

      expect(mockValidate).toHaveBeenCalledWith(
        { email: "test@example.com", ref: "homepage", id: "123" },
        { email: "required|email" },
        {},
      );
    });

    it("stores validated data on success", async () => {
      class TestRequest extends FormRequest {
        rules() {
          return { name: "required" };
        }
      }

      mockValidate.mockResolvedValue({ name: "John" });

      const req = createMockReq({ body: { name: "John" } });
      const instance = new TestRequest(req);
      await instance.validate();

      expect(instance.validated()).toEqual({ name: "John" });
    });

    it("stores errors on failure and rethrows", async () => {
      class TestRequest extends FormRequest {
        rules() {
          return { email: "required|email" };
        }
      }

      mockValidate.mockRejectedValue(
        new mockValidationError(
          { email: ["required", "email"] },
          { email: ["The email field is required.", "The email must be a valid email address."] },
        ),
      );

      const req = createMockReq({ body: {} });
      const instance = new TestRequest(req);

      await expect(instance.validate()).rejects.toThrow();
      expect(instance.fails()).toBe(true);
      expect(instance.errors()).toEqual({
        email: ["The email field is required.", "The email must be a valid email address."],
      });
    });

    it("is idempotent — calling validate() twice runs once", async () => {
      class TestRequest extends FormRequest {
        rules() {
          return { name: "required" };
        }
      }

      mockValidate.mockResolvedValue({ name: "John" });

      const req = createMockReq({ body: { name: "John" } });
      const instance = new TestRequest(req);

      await instance.validate();
      await instance.validate();

      expect(mockValidate).toHaveBeenCalledTimes(1);
    });
  });

  describe("validated()", () => {
    it("returns validated data after successful validation", async () => {
      class TestRequest extends FormRequest {
        rules() {
          return { age: "numeric" };
        }
      }

      mockValidate.mockResolvedValue({ age: 25 });

      const req = createMockReq({ body: { age: "25" } });
      const instance = new TestRequest(req);
      await instance.validate();

      expect(instance.validated()).toEqual({ age: 25 });
    });
  });

  describe("safe()", () => {
    it("returns a shallow copy of validated data", async () => {
      class TestRequest extends FormRequest {
        rules() {
          return { name: "required" };
        }
      }

      mockValidate.mockResolvedValue({ name: "John" });

      const req = createMockReq({ body: { name: "John" } });
      const instance = new TestRequest(req);
      await instance.validate();

      const data = instance.safe();
      expect(data).toEqual({ name: "John" });
      expect(data).not.toBe(instance.validated());
    });
  });

  describe("fails() / passed()", () => {
    it("returns false / true when validation passes", async () => {
      class TestRequest extends FormRequest {
        rules() {
          return { name: "required" };
        }
      }

      mockValidate.mockResolvedValue({ name: "John" });

      const req = createMockReq({ body: { name: "John" } });
      const instance = new TestRequest(req);
      await instance.validate();

      expect(instance.fails()).toBe(false);
      expect(instance.passed()).toBe(true);
    });

    it("returns true / false when validation fails", async () => {
      class TestRequest extends FormRequest {
        rules() {
          return { name: "required" };
        }
      }

      mockValidate.mockRejectedValue(
        new mockValidationError(
          { name: ["required"] },
          { name: ["The name field is required."] },
        ),
      );

      const req = createMockReq({ body: {} });
      const instance = new TestRequest(req);

      await expect(instance.validate()).rejects.toThrow();
      expect(instance.fails()).toBe(true);
      expect(instance.passed()).toBe(false);
    });
  });

  describe("input()", () => {
    it("returns all input merged from body, query, and params", () => {
      class TestRequest extends FormRequest {
        rules() {
          return {};
        }
      }
      const req = createMockReq({
        body: { name: "John" },
        query: { ref: "home" },
        params: { id: "42" },
      });
      const instance = new TestRequest(req);

      expect(instance.input()).toEqual({ name: "John", ref: "home", id: "42" });
    });

    it("returns a specific key with default", () => {
      class TestRequest extends FormRequest {
        rules() {
          return {};
        }
      }
      const req = createMockReq({ body: { name: "John" } });
      const instance = new TestRequest(req);

      expect(instance.input("name")).toBe("John");
      expect(instance.input("missing", "default")).toBe("default");
    });
  });

  describe("only() / except()", () => {
    it("only() returns specified keys", () => {
      class TestRequest extends FormRequest {
        rules() {
          return {};
        }
      }
      const req = createMockReq({
        body: { name: "John", email: "john@test.com", age: "30" },
      });
      const instance = new TestRequest(req);

      expect(instance.only("name", "email")).toEqual({
        name: "John",
        email: "john@test.com",
      });
    });

    it("except() returns all but specified keys", () => {
      class TestRequest extends FormRequest {
        rules() {
          return {};
        }
      }
      const req = createMockReq({
        body: { name: "John", email: "john@test.com", age: "30" },
      });
      const instance = new TestRequest(req);

      expect(instance.except("age")).toEqual({
        name: "John",
        email: "john@test.com",
      });
    });
  });

  describe("request passthrough properties", () => {
    it("exposes body, query, params, headers", () => {
      class TestRequest extends FormRequest {
        rules() {
          return {};
        }
      }
      const req = createMockReq({
        body: { key: "value" },
        query: { q: "search" },
        params: { id: "1" },
        headers: { "content-type": "application/json" },
      });
      const instance = new TestRequest(req);

      expect(instance.body).toEqual({ key: "value" });
      expect(instance.query).toEqual({ q: "search" });
      expect(instance.params).toEqual({ id: "1" });
      expect(instance.headers["content-type"]).toBe("application/json");
    });

    it("exposes ip, method, path, url, originalUrl", () => {
      class TestRequest extends FormRequest {
        rules() {
          return {};
        }
      }
      const req = createMockReq({
        ip: "192.168.1.1",
        method: "GET",
        path: "/users",
        url: "/users?page=1",
        originalUrl: "/users?page=1",
      });
      const instance = new TestRequest(req);

      expect(instance.ip).toBe("192.168.1.1");
      expect(instance.method).toBe("GET");
      expect(instance.path).toBe("/users");
      expect(instance.url).toBe("/users?page=1");
      expect(instance.originalUrl).toBe("/users?page=1");
    });
  });

  describe("bearerToken()", () => {
    it("extracts Bearer token from Authorization header", () => {
      class TestRequest extends FormRequest {
        rules() {
          return {};
        }
      }
      const req = createMockReq({
        headers: { authorization: "Bearer my-token-123" },
      });
      const instance = new TestRequest(req);

      expect(instance.bearerToken()).toBe("my-token-123");
    });

    it("returns null when no Authorization header", () => {
      class TestRequest extends FormRequest {
        rules() {
          return {};
        }
      }
      const instance = new TestRequest(createMockReq());
      expect(instance.bearerToken()).toBeNull();
    });

    it("returns null when not Bearer scheme", () => {
      class TestRequest extends FormRequest {
        rules() {
          return {};
        }
      }
      const req = createMockReq({
        headers: { authorization: "Basic dXNlcjpwYXNz" },
      });
      const instance = new TestRequest(req);

      expect(instance.bearerToken()).toBeNull();
    });
  });

  describe("getRequest()", () => {
    it("returns the underlying Express request", () => {
      class TestRequest extends FormRequest {
        rules() {
          return {};
        }
      }
      const req = createMockReq({ method: "PATCH" });
      const instance = new TestRequest(req);

      expect(instance.getRequest()).toBe(req);
      expect(instance.getRequest().method).toBe("PATCH");
    });
  });

  describe("manual instantiation", () => {
    it("can be used outside the router", async () => {
      class LoginRequest extends FormRequest {
        rules() {
          return { email: "required|email" };
        }
      }

      mockValidate.mockResolvedValue({ email: "user@test.com" });

      const req = createMockReq({ body: { email: "user@test.com" } });
      const instance = new LoginRequest(req);
      await instance.validate();

      expect(instance.validated()).toEqual({ email: "user@test.com" });
      expect(instance.passed()).toBe(true);
    });
  });
});
