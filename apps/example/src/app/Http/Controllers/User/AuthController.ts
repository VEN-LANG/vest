import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Doc } from '@lara-node/router';
import { AuthService } from '@app/Services/index';
import { RegisterRequest, LoginRequest } from '@app/Http/Requests/index';

@Injectable()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Doc({
    summary: 'Register a new user',
    tags: ['Auth'],
    body: {
      name: { type: 'string', description: 'Full name' },
      email: { type: 'string', description: 'Email address' },
      password: { type: 'string', description: 'Password (min 8 chars)' },
    },
    responses: [{ status: 201, description: 'User created' }, { status: 422, description: 'Validation error' }],
  })
  async register(req: RegisterRequest, res: Response): Promise<void> {
    const data = req.validated();
    const user = await this.authService.register(data);
    res.status(201).json({ success: true, data: user });
  }

  @Doc({
    summary: 'Login and receive JWT token',
    tags: ['Auth'],
    body: {
      email: { type: 'string', description: 'Email address' },
      password: { type: 'string', description: 'Password' },
    },
    responses: [{ status: 200, description: 'JWT token and user' }, { status: 401, description: 'Invalid credentials' }],
  })
  async login(req: LoginRequest, res: Response): Promise<void> {
    const { email, password } = req.validated();
    const result = await this.authService.login(email, password);
    res.json({ success: true, data: result });
  }

  @Doc({
    summary: 'Get the authenticated user',
    tags: ['Auth'],
    auth: true,
    responses: [{ status: 200, description: 'Current user with roles and permissions' }],
  })
  async me(req: Request, res: Response): Promise<void> {
    const user = await this.authService.me(req.user!.id);
    res.json({ success: true, data: user });
  }
}
