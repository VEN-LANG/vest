import { describe, expect, it, vi } from "vitest";
import type { Request as ExpressRequest } from "express";

vi.mock("@lara-node/validator", () => ({
  validate: vi.fn(),
  ValidationError: class ValidationError extends Error {},
}));

const { Request, request, requestOrFail } = await import("../Request.js");
const { asyncLocalStorage } = await import("../context.js");

function mockReq(overrides: Record<string, unknown> = {}): ExpressRequest {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    cookies: {},
    ip: "127.0.0.1",
    method: "GET",
    path: "/test",
    url: "/test",
    originalUrl: "/test",
    hostname: "example.test",
    ...overrides,
  } as unknown as ExpressRequest;
}

/** Run `fn` as if inside a request handled by AsyncContextMiddleware. */
function inRequest<T>(req: ExpressRequest, fn: () => T): T {
  return asyncLocalStorage.run({ req }, fn);
}

describe("request() resolution", () => {
  it("returns null outside a request context", () => {
    expect(request()).toBeNull();
  });

  it("returns the current request inside a context", () => {
    const req = mockReq({ path: "/users" });
    inRequest(req, () => {
      expect(request()).not.toBeNull();
      expect(request()!.path).toBe("/users");
    });
  });

  it("returns null again after the context exits", () => {
    inRequest(mockReq(), () => request());
    expect(request()).toBeNull();
  });

  it("survives async boundaries within the request", async () => {
    const req = mockReq({ path: "/deep" });
    await inRequest(req, async () => {
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 1));
      expect(request()!.path).toBe("/deep");
    });
  });

  it("returns the same instance on repeated calls, so merges persist", () => {
    inRequest(mockReq(), () => {
      const first = request()!;
      first.merge({ tenant: "acme" });
      expect(request()).toBe(first);
      expect(request()!.input("tenant")).toBe("acme");
    });
  });

  it("requestOrFail() throws outside a context but resolves inside", () => {
    expect(() => requestOrFail()).toThrow(/No request is bound/);
    inRequest(mockReq(), () => expect(requestOrFail()).toBeInstanceOf(Request));
  });

  it("is registered on globalThis by the package entry point", async () => {
    await import("../index.js");
    expect(typeof (globalThis as { request?: unknown }).request).toBe("function");
  });
});

describe("headers accessor", () => {
  const req = mockReq({
    headers: {
      referer: "https://google.com/search?q=x",
      "user-agent": "Mozilla/5.0",
      "content-type": "application/json; charset=utf-8",
      "x-multi": ["a", "b"],
    },
  });
  const r = Request.from(req);

  it("reads one header when called with a key", () => {
    expect(r.headers("referer")).toBe("https://google.com/search?q=x");
  });

  it("is case-insensitive", () => {
    expect(r.headers("User-Agent")).toBe("Mozilla/5.0");
  });

  it("returns the default for a missing header", () => {
    expect(r.headers("x-nope", "fallback")).toBe("fallback");
    expect(r.headers("x-nope")).toBeUndefined();
  });

  it("returns every header when called with no key", () => {
    expect(r.headers()).toMatchObject({ referer: "https://google.com/search?q=x" });
  });

  it("stays indexable so headers['x'] keeps working", () => {
    expect(r.headers["user-agent"]).toBe("Mozilla/5.0");
  });

  it("joins repeated headers into one string", () => {
    expect(r.headers("x-multi")).toBe("a, b");
  });
});

describe("referrer and origin", () => {
  it("reads the misspelled Referer header", () => {
    const r = Request.from(mockReq({ headers: { referer: "https://news.test/a" } }));
    expect(r.referrer()).toBe("https://news.test/a");
    expect(r.referer()).toBe("https://news.test/a");
    expect(r.referrerHost()).toBe("news.test");
  });

  it("returns the default when absent", () => {
    const r = Request.from(mockReq());
    expect(r.referrer()).toBeUndefined();
    expect(r.referrer("direct")).toBe("direct");
    expect(r.referrerHost()).toBeUndefined();
  });

  it("survives an unparseable referrer", () => {
    const r = Request.from(mockReq({ headers: { referer: "not a url" } }));
    expect(r.referrerHost()).toBeUndefined();
  });

  it("detects a cross-origin request", () => {
    const same = Request.from(
      mockReq({ headers: { host: "app.test", origin: "https://app.test" } }),
    );
    const cross = Request.from(
      mockReq({ headers: { host: "app.test", origin: "https://evil.test" } }),
    );
    expect(same.isCrossOrigin()).toBe(false);
    expect(cross.isCrossOrigin()).toBe(true);
    expect(Request.from(mockReq()).isCrossOrigin()).toBe(false);
  });
});

describe("content metadata", () => {
  const r = Request.from(
    mockReq({
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-length": "512",
      },
    }),
  );

  it("strips parameters from the content type", () => {
    expect(r.contentType()).toBe("application/json");
  });

  it("extracts the charset", () => {
    expect(r.charset()).toBe("utf-8");
  });

  it("parses content length, defaulting to 0", () => {
    expect(r.contentLength()).toBe(512);
    expect(Request.from(mockReq()).contentLength()).toBe(0);
  });
});

describe("request id", () => {
  it("reuses an upstream X-Request-Id", () => {
    const r = Request.from(mockReq({ headers: { "x-request-id": "abc-123" } }));
    expect(r.requestId()).toBe("abc-123");
  });

  it("generates a stable id when none was supplied", () => {
    const r = Request.from(mockReq());
    expect(r.requestId()).toBe(r.requestId());
    expect(r.requestId()).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("content negotiation", () => {
  it("orders accepted types by q-value", () => {
    const r = Request.from(
      mockReq({ headers: { accept: "text/html;q=0.8, application/json;q=0.9, */*;q=0.1" } }),
    );
    expect(r.acceptableContentTypes()).toEqual(["application/json", "text/html", "*/*"]);
  });

  it("drops entries with q=0", () => {
    const r = Request.from(mockReq({ headers: { accept: "text/html, application/xml;q=0" } }));
    expect(r.acceptableContentTypes()).toEqual(["text/html"]);
  });

  it("matches wildcards", () => {
    const r = Request.from(mockReq({ headers: { accept: "text/*" } }));
    expect(r.accepts("text/html")).toBe(true);
    expect(r.accepts("application/json")).toBe(false);
  });

  it("treats a missing Accept header as accepting anything", () => {
    const r = Request.from(mockReq());
    expect(r.acceptsAnyContentType()).toBe(true);
    expect(r.accepts("application/json")).toBe(true);
  });

  it("detects json and html preferences", () => {
    const json = Request.from(mockReq({ headers: { accept: "application/json" } }));
    expect(json.acceptsJson()).toBe(true);
    expect(json.acceptsHtml()).toBe(false);
  });

  it("picks the preferred language, matching on the base tag", () => {
    const r = Request.from(
      mockReq({ headers: { "accept-language": "fr-CH;q=0.9, en-GB;q=1.0, de;q=0.7" } }),
    );
    expect(r.languages()).toEqual(["en-GB", "fr-CH", "de"]);
    expect(r.language()).toBe("en-GB");
    expect(r.preferredLanguage(["de", "en"])).toBe("en");
    expect(r.preferredLanguage(["es", "it"])).toBe("es");
  });

  it("lists accepted encodings", () => {
    const r = Request.from(mockReq({ headers: { "accept-encoding": "gzip, br;q=1.0, *;q=0.1" } }));
    expect(r.encodings()).toEqual(["gzip", "br", "*"]);
  });
});

describe("method predicates", () => {
  it("identifies the verb", () => {
    const r = Request.from(mockReq({ method: "POST" }));
    expect(r.isPost()).toBe(true);
    expect(r.isGet()).toBe(false);
  });

  it("classifies safe and idempotent methods", () => {
    expect(Request.from(mockReq({ method: "GET" })).isMethodSafe()).toBe(true);
    expect(Request.from(mockReq({ method: "POST" })).isMethodSafe()).toBe(false);
    expect(Request.from(mockReq({ method: "PUT" })).isMethodIdempotent()).toBe(true);
    expect(Request.from(mockReq({ method: "POST" })).isMethodIdempotent()).toBe(false);
  });
});

describe("client info", () => {
  it("prefers the left-most X-Forwarded-For entry", () => {
    const r = Request.from(
      mockReq({ headers: { "x-forwarded-for": "203.0.113.9, 70.41.3.18" }, ip: "10.0.0.1" }),
    );
    expect(r.clientIp()).toBe("203.0.113.9");
    expect(r.ips()).toEqual(["203.0.113.9", "70.41.3.18"]);
  });

  it("falls back to the socket address", () => {
    expect(Request.from(mockReq({ ip: "10.0.0.1" })).clientIp()).toBe("10.0.0.1");
  });

  it("detects bots and mobile clients", () => {
    expect(Request.from(mockReq({ headers: { "user-agent": "Googlebot/2.1" } })).isBot()).toBe(true);
    expect(Request.from(mockReq({ headers: { "user-agent": "curl/8.0" } })).isBot()).toBe(true);
    expect(
      Request.from(mockReq({ headers: { "user-agent": "Mozilla/5.0 (iPhone)" } })).isMobile(),
    ).toBe(true);
    expect(Request.from(mockReq()).isBot()).toBe(false);
  });
});

describe("credentials", () => {
  it("extracts a bearer token", () => {
    const r = Request.from(mockReq({ headers: { authorization: "Bearer tok-123" } }));
    expect(r.bearerToken()).toBe("tok-123");
  });

  it("decodes basic credentials", () => {
    const encoded = Buffer.from("alice:s3cr3t:with:colons").toString("base64");
    const r = Request.from(mockReq({ headers: { authorization: `Basic ${encoded}` } }));
    expect(r.basicAuth()).toEqual({ username: "alice", password: "s3cr3t:with:colons" });
  });

  it("returns null for a non-basic scheme", () => {
    const r = Request.from(mockReq({ headers: { authorization: "Bearer tok" } }));
    expect(r.basicAuth()).toBeNull();
  });
});

describe("url and route helpers", () => {
  const r = Request.from(
    mockReq({
      headers: { host: "app.test:8080" },
      path: "/users/42",
      params: { id: "42" },
      originalUrl: "/users/42?tab=posts",
    }),
  );

  it("reads the port from the host header", () => {
    expect(r.port()).toBe(8080);
    expect(Request.from(mockReq({ headers: { host: "app.test" } })).port()).toBe(80);
  });

  it("returns the raw query string", () => {
    expect(r.queryString()).toBe("tab=posts");
    expect(Request.from(mockReq()).queryString()).toBe("");
  });

  it("glob-matches the path and the full url", () => {
    expect(r.is("/users/*")).toBe(true);
    expect(r.is("/posts/*")).toBe(false);
    expect(r.fullUrlIs("http://app.test:8080/users/*")).toBe(true);
  });

  it("reads route parameters", () => {
    expect(r.routeParam("id")).toBe("42");
    expect(r.routeParam("missing", "none")).toBe("none");
    expect(r.route()).toEqual({ id: "42" });
  });
});

describe("store()", () => {
  it("reads and writes the async context", () => {
    inRequest(mockReq(), () => {
      request()!.store("tenant", "acme");
      expect(request()!.store("tenant")).toBe("acme");
      expect(request()!.store()).toMatchObject({ tenant: "acme" });
    });
  });

  it("is a no-op outside a request", () => {
    const r = Request.from(mockReq());
    expect(r.store("k", "v")).toBe("v");
    expect(r.store("k")).toBeUndefined();
  });
});

describe("timing", () => {
  it("reports elapsed time from first wrap", async () => {
    const r = Request.from(mockReq());
    const started = r.startedAt();
    expect(r.startedAt()).toBe(started);
    await new Promise((res) => setTimeout(res, 5));
    expect(r.elapsed()).toBeGreaterThanOrEqual(4);
  });
});
