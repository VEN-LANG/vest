import { RequestHandler, ErrorRequestHandler } from 'express';
import { HttpKernel as BaseKernel, middlewareStack } from '@lara-node/router';
import type { Middleware } from '@lara-node/core';
import {
  AsyncContextMiddleware,
  RequestLoggerMiddleware,
  RequestExtenderMiddleware,
  ValidatorMiddleware,
  ResponseExtenderMiddleware,
  ErrorHandlerMiddleware,
} from '@lara-node/middlewares';

/*
|--------------------------------------------------------------------------
| HTTP Kernel
|--------------------------------------------------------------------------
|
| Extends the base HttpKernel from @lara-node/router.
|
| - `middleware`  — global middleware applied to every request
|
| Named middleware aliases (auth, can, role, must-be-active) are registered
| in MiddlewareServiceProvider, NOT here, so they are available before
| route files are loaded in RouteServiceProvider.boot().
|
*/
export class Kernel extends BaseKernel {
  protected override middleware: RequestHandler[] = middlewareStack.resolveMiddlewareStack([
    AsyncContextMiddleware,
    RequestLoggerMiddleware,
    RequestExtenderMiddleware,
    ValidatorMiddleware,
    ResponseExtenderMiddleware,
  ] as Middleware[]);

  readonly errorHandler: ErrorRequestHandler = (err, req, res, next) =>
    new ErrorHandlerMiddleware().handle(err, req, res, next);
}
