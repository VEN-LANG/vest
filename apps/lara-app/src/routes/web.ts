import RouterBuilder from '@lara-node/router';
import { Request, Response } from 'express';

export const webRoutesBuilder = new RouterBuilder();

webRoutesBuilder.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Lara App', version: '1.0.0' });
});

export default webRoutesBuilder;
