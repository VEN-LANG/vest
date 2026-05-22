import { Request, Response } from 'express';
import RouterBuilder from '@lara-node/router';

export const webRoutesBuilder = new RouterBuilder();

webRoutesBuilder.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to apps/example', version: '1.0.0' });
});

export default webRoutesBuilder;
