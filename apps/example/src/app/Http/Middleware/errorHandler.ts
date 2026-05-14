import type { Request, Response, NextFunction } from "express";
import { ValidationError } from "@app/Helpers/validator";

// Standardized JSON error response
export default function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // Already sent? Abort.
  if (res.headersSent) return;

  // Validation errors
  if (err instanceof ValidationError) {
    return res.status(422).json({
      success: false,
      errors: err.errors,
      messages: err.messages,
      message: err.message,
    });
  }

  // Extract status & message
  const status =
    typeof err.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 500;
  const message = err.message || "Internal Server Error";

  const payload: any = {
    success: false,
    message,
  };

  // Include additional structured details if present
  if (err.code) payload.code = err.code;
  if (err.errors && typeof err.errors === "object") payload.errors = err.errors;

  // Only expose stack traces outside production
  if (process.env.NODE_ENV !== "production" && err.stack)
    payload.stack = err.stack.split("\n").map((l: string) => l.trim());

  return res.status(status).json(payload);
}
