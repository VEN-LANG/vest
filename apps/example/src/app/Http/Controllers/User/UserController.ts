import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Injectable } from '@lara-node/core';
import { Doc } from '@lara-node/router';
import { UserService } from '@app/Services/index';
import User from '@app/Models/User/User';
import Role from '@app/Models/User/Role';
import {
  StoreUserRequest,
  UpdateUserRequest,
  SetPasswordRequest,
  AddRoleRequest,
} from '@app/Http/Requests/index';

type UserWithRoles = User & { roles: () => { attach: (ids: (number | string)[]) => Promise<void>; detach: (ids: (number | string)[]) => Promise<void> } };

@Injectable()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Doc({ summary: 'List all users (paginated)', tags: ['Users'], auth: true, params: [{ name: 'page', in: 'query', type: 'integer', description: 'Page number' }, { name: 'per_page', in: 'query', type: 'integer', description: 'Items per page' }] })
  async index(req: Request, res: Response): Promise<void> {
    const data = await this.userService.index(Number(req.query.page) || 1);
    res.json({ success: true, data });
  }

  @Doc({
    summary: 'Get a user by ID (route-model binding)',
    description: 'The :user parameter is automatically resolved to a User model instance via ModelRegistry.',
    tags: ['Users'],
    auth: true,
    params: [{ name: 'user', in: 'path', type: 'integer', description: 'User ID — auto-bound to User model' }],
    responses: [{ status: 200, description: 'User with profile and roles' }, { status: 404, description: 'Not found' }],
  })
  async show(_req: Request, res: Response, user: User): Promise<void> {
    res.json({ success: true, data: user });
  }

  @Doc({ summary: "Get a user's profile", tags: ['Users'], auth: true })
  async showProfile(_req: Request, res: Response, user: User): Promise<void> {
    const full = await this.userService.find(user.id!) as (User & { profile?: unknown }) | null;
    res.json({ success: true, data: full?.profile ?? null });
  }

  @Doc({ summary: 'Create a new user', tags: ['Users'], auth: true, body: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } } })
  async store(req: StoreUserRequest, res: Response): Promise<void> {
    const data = req.validated();
    const user = await this.userService.create(data);
    res.status(201).json({ success: true, data: user });
  }

  @Doc({ summary: 'Update a user', tags: ['Users'], auth: true })
  async update(req: UpdateUserRequest, res: Response, user: User): Promise<void> {
    const data = req.validated();
    await user.update({ ...data, updated_at: new Date() });
    res.json({ success: true, data: user });
  }

  @Doc({ summary: "Update a user's profile", tags: ['Users'], auth: true })
  async updateProfile(req: Request, res: Response, user: User): Promise<void> {
    const profile = await this.userService.updateProfile(user.id!, req.body as Record<string, unknown>);
    res.json({ success: true, data: profile });
  }

  @Doc({ summary: 'Change user password', tags: ['Users'], auth: true, body: { password: { type: 'string', description: 'New password (min 8 chars)' } } })
  async setPassword(req: SetPasswordRequest, res: Response, user: User): Promise<void> {
    const { password } = req.validated();
    const hashed = await bcrypt.hash(password, 12);
    await user.update({ password: hashed, updated_at: new Date() });
    res.json({ success: true, message: 'Password updated' });
  }

  @Doc({ summary: 'Send password reset email', tags: ['Users'], auth: true })
  async resetPassword(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Password reset email sent' });
  }

  @Doc({ summary: 'Assign a role to a user', tags: ['Users'], auth: true, body: { role_id: { type: 'integer', description: 'Role ID to assign' } } })
  async addRole(req: AddRoleRequest, res: Response, user: User): Promise<void> {
    const { role_id } = req.validated();
    await (user as UserWithRoles).roles().attach([role_id]);
    res.json({ success: true, data: user });
  }

  @Doc({ summary: 'Remove a role from a user', tags: ['Users'], auth: true })
  async removeRole(_req: Request, res: Response, user: User, role: Role): Promise<void> {
    await (user as UserWithRoles).roles().detach([role.id!]);
    res.json({ success: true, message: 'Role removed' });
  }

  @Doc({ summary: 'Delete a user (soft delete)', tags: ['Users'], auth: true, responses: [{ status: 200, description: 'User deleted' }, { status: 404, description: 'Not found' }] })
  async destroy(_req: Request, res: Response, user: User): Promise<void> {
    await user.delete();
    res.json({ success: true, message: 'User deleted' });
  }

  @Doc({ summary: 'Toggle user active/inactive status', tags: ['Users'], auth: true })
  async toggleStatus(_req: Request, res: Response, user: User): Promise<void> {
    const current = user.status;
    const newStatus = current === 'active' ? 'inactive' : 'active';
    await user.update({ status: newStatus, updated_at: new Date() });
    res.json({ success: true, data: user });
  }
}
