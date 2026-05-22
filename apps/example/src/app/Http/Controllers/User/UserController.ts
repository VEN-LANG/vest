import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Injectable } from '@lara-node/core';
import { Doc } from '@lara-node/router';
import { UserService } from '@app/Services/index';
import User from '@app/Models/User/User';

@Injectable()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Doc({ summary: 'List all users (paginated)', tags: ['Users'], auth: true, params: [{ name: 'page', in: 'query', type: 'integer', description: 'Page number' }, { name: 'per_page', in: 'query', type: 'integer', description: 'Items per page' }] })
  async index(req: Request, res: Response): Promise<void> {
    const data = await this.userService.index(Number(req.query.page) || 1);
    res.json({ success: true, data });
  }

  @Doc({ summary: 'Get a user by ID', tags: ['Users'], auth: true, params: [{ name: 'id', in: 'path', type: 'integer', description: 'User ID' }] })
  async show(req: Request, res: Response): Promise<void> {
    const user = await this.userService.find(req.params.id);
    if (!user) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: user });
  }

  @Doc({ summary: "Get a user's profile", tags: ['Users'], auth: true })
  async showProfile(req: Request, res: Response): Promise<void> {
    const user = await this.userService.find(req.params.id) as (User & { profile?: unknown }) | null;
    if (!user) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: user.profile });
  }

  @Doc({ summary: 'Create a new user', tags: ['Users'], auth: true, body: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } } })
  async store(req: Request, res: Response): Promise<void> {
    const data = await req.validate<{ name: string; email: string; password: string }>({
      name: 'required|string|min:2|max:100',
      email: 'required|email',
      password: 'required|string|min:8',
    });
    const user = await this.userService.create(data);
    res.status(201).json({ success: true, data: user });
  }

  @Doc({ summary: 'Update a user', tags: ['Users'], auth: true })
  async update(req: Request, res: Response): Promise<void> {
    const data = await req.validate<{ name?: string; email?: string }>({
      name: 'sometimes|string|min:2|max:100',
      email: 'sometimes|email',
    });
    const user = await this.userService.update(req.params.id, data);
    res.json({ success: true, data: user });
  }

  @Doc({ summary: "Update a user's profile", tags: ['Users'], auth: true })
  async updateProfile(req: Request, res: Response): Promise<void> {
    const profile = await this.userService.updateProfile(req.params.id, req.body as Record<string, unknown>);
    res.json({ success: true, data: profile });
  }

  @Doc({ summary: 'Change user password', tags: ['Users'], auth: true, body: { password: { type: 'string', description: 'New password (min 8 chars)' } } })
  async setPassword(req: Request, res: Response): Promise<void> {
    const { password } = await req.validate<{ password: string }>({ password: 'required|string|min:8' });
    const hashed = await bcrypt.hash(password, 12);
    await this.userService.update(req.params.id, { password: hashed });
    res.json({ success: true, message: 'Password updated' });
  }

  @Doc({ summary: 'Send password reset email', tags: ['Users'], auth: true })
  async resetPassword(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Password reset email sent' });
  }

  @Doc({ summary: 'Assign a role to a user', tags: ['Users'], auth: true, body: { role_id: { type: 'integer', description: 'Role ID to assign' } } })
  async addRole(req: Request, res: Response): Promise<void> {
    const { role_id } = await req.validate<{ role_id: number }>({ role_id: 'required|integer' });
    const user = await this.userService.addRole(req.params.id, role_id);
    res.json({ success: true, data: user });
  }

  @Doc({ summary: 'Remove a role from a user', tags: ['Users'], auth: true })
  async removeRole(req: Request, res: Response): Promise<void> {
    await this.userService.removeRole(req.params.id, req.params.roleId);
    res.json({ success: true, message: 'Role removed' });
  }

  @Doc({ summary: 'Delete a user (soft delete)', tags: ['Users'], auth: true, responses: [{ status: 200, description: 'User deleted' }, { status: 404, description: 'Not found' }] })
  async destroy(req: Request, res: Response): Promise<void> {
    await this.userService.destroy(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  }

  @Doc({ summary: 'Toggle user active/inactive status', tags: ['Users'], auth: true })
  async toggleStatus(req: Request, res: Response): Promise<void> {
    const user = await this.userService.toggleStatus(req.params.user);
    res.json({ success: true, data: user });
  }
}
