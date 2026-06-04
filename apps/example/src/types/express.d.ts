import type { FormRequest } from '@lara-node/middlewares';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Request extends FormRequest {}
  }
}

export {};
