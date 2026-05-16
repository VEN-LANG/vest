import type { Request, Response, NextFunction } from "express";
import { Model } from "@lara-node/db";
import { QueryResult } from "@lara-node/db";

declare global {
  namespace Express {
    interface Response {
      jsonAsync: <T extends { toJSONAsync: () => Promise<any> } | QueryResult<any> | any>(
        data: T,
      ) => Promise<Response>;
    }
  }
}

function isQueryResult(obj: any): obj is QueryResult<any> {
  return obj && typeof obj === "object" && Array.isArray(obj.data);
}

/**
 * Recursively check if an object or its relations contain Models
 */
function containsModels(obj: any, visited = new WeakSet()): boolean {
  // Only objects can be added to WeakSet, not primitives
  if (obj === null || obj === undefined) return false;

  const isObject = typeof obj === "object";
  if (isObject && visited.has(obj)) return false;

  if (isObject) {
    visited.add(obj);
  }

  if (obj instanceof Model) return true;

  if (Array.isArray(obj)) {
    return obj.some((item) => containsModels(item, visited));
  }

  if (isQueryResult(obj)) {
    return obj.data.some((item) => containsModels(item, visited));
  }

  if (isObject) {
    return Object.values(obj).some((val) => containsModels(val, visited));
  }

  return false;
}

export default function responseExtenderMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Save the original json function before overriding it
  const originalJson = res.json.bind(res);

  // Extend jsonAsync to handle async data and call the original json
  res.jsonAsync = async function <
    T extends { toJSONAsync: () => Promise<any> } | QueryResult<any> | any,
  >(data: T): Promise<Response> {
    if (data instanceof Model) {
      return originalJson(await data.toJSONAsync());
    }

    // Handle plain arrays of models (e.g. EloquentBuilder.get() returns Model[])
    if (Array.isArray(data)) {
      if (data.length === 0) return originalJson(data);
      const processed = await Promise.all(
        data.map(async (item: any) => {
          if (item instanceof Model && item?.toJSONAsync) {
            return await item.toJSONAsync();
          } else if (item?.toJSONAsync) {
            return await item.toJSONAsync();
          }
          return item;
        }),
      );
      return originalJson(processed);
    }

    if (isQueryResult(data)) {
      // If QueryResult.data has items, async convert them
      if (data.data.length > 0) {
        const processed = await Promise.all(
          data.data.map(async (item: any) => {
            if (item instanceof Model && item?.toJSONAsync) {
              return await item.toJSONAsync();
            } else if (item?.toJSONAsync) {
              return await item.toJSONAsync();
            }
            return item;
          }),
        );

        // Create a new QueryResult with replaced data
        const jsonResult = {
          ...data,
          data: processed,
        };

        return originalJson(jsonResult);
      }

      // If array empty, just return QueryResult as-is
      return originalJson(data);
    }
    return originalJson(data);
  };

  // Override json to automatically handle async conversion for Models
  const originalJsonForJson = res.json;
  res.json = function <T>(this: Response, data?: T): Response {
    // Check if data needs async processing
    if (data instanceof Model) {
      // Return the promise from jsonAsync - Express will handle it
      return (res as any).jsonAsync(data);
    }

    if (Array.isArray(data) && data.length > 0 && data.some((item: any) => item instanceof Model)) {
      // Return the promise from jsonAsync - Express will handle it
      return (res as any).jsonAsync(data);
    }

    if (isQueryResult(data)) {
      // Return the promise from jsonAsync - Express will handle it
      return (res as any).jsonAsync(data);
    }

    // Check if data (including nested) contains Models with async accessors
    // This handles cases where toJSON() was already called but we need async processing
    if (containsModels(data)) {
      // Still need to use jsonAsync for proper async handling
      return (res as any).jsonAsync(data);
    }

    // For regular data, use original json
    return originalJsonForJson.call(this, data);
  }.bind(res);

  next();
}
