import RouterBuilder from '@lara-node/router';
import { Request, Response } from 'express';

export const routesBuilder = new RouterBuilder();
const rb = routesBuilder;

rb.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

rb.prefix('/auth').group((g: RouterBuilder) => {
  g.post('/register', (req: Request, res: Response) => {
    res.status(201).json({ success: true, message: 'Registered' });
  });
  g.post('/login', (req: Request, res: Response) => {
    res.json({ success: true, token: 'mock-token' });
  });
  g.get('/me', 'auth', (req: Request, res: Response) => {
    res.json({ success: true, user: (req as any).user });
  });
});

rb.prefix('/users').middleware(['auth']).group((g: RouterBuilder) => {
  g.get('/', 'can:view_users', (req: Request, res: Response) => {
    res.json({ success: true, data: [] });
  });
  g.post('/', 'can:create_users', (req: Request, res: Response) => {
    res.status(201).json({ success: true });
  });
  g.get('/:id', 'can:view_users', (req: Request, res: Response) => {
    res.json({ success: true, data: { id: req.params.id } });
  });
  g.put('/:id', 'can:update_users', (req: Request, res: Response) => {
    res.json({ success: true });
  });
  g.delete('/:id', 'can:delete_users', (req: Request, res: Response) => {
    res.json({ success: true });
  });
});

export default rb;
