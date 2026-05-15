import type { Request, Response } from "express";
import RouterBuilder from "@vest-ts/router";
import { AuthController } from "@app/Http/Controllers/AuthController.js";
import { PostController } from "@app/Http/Controllers/PostController.js";

export const apiRouter = new RouterBuilder();

// ── Health check ─────────────────────────────────────────────────────────────
apiRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Authentication ────────────────────────────────────────────────────────────
apiRouter.prefix("/auth").group((r) => {
  r.post("/register", [AuthController, "register"]);
  r.post("/login", [AuthController, "login"]);
  r.get("/me", "auth", [AuthController, "me"]);
});

// ── Posts ─────────────────────────────────────────────────────────────────────
apiRouter.prefix("/posts").group((r) => {
  r.get("/", [PostController, "index"]); // public  — list published posts
  r.get("/:id", [PostController, "show"]); // public  — single post + analytics
  r.post("/", "auth", [PostController, "store"]); // private — create + fires PostCreated event
  r.put("/:id", "auth", [PostController, "update"]); // private — author only
  r.delete("/:id", "auth", [PostController, "destroy"]); // private — author only
});
