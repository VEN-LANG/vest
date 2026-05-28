import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Doc } from '@lara-node/router';
import { RoleService } from '@app/Services/index';
import Role from '@app/Models/User/Role';
import { StoreRoleRequest, UpdateRoleRequest, SyncPermissionsRequest } from '@app/Http/Requests/index';

type RoleWithPermissions = Role & { permissions: () => { sync: (ids: number[]) => Promise<void> } };

@Injectable()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Doc({ summary: 'List all roles with permissions', tags: ['Roles'], auth: true })
  async index(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: await this.roleService.index() });
  }

  @Doc({
    summary: 'Get a role by ID (route-model binding)',
    description: 'The :role parameter is automatically resolved to a Role model instance via ModelRegistry.',
    tags: ['Roles'],
    auth: true,
    params: [{ name: 'role', in: 'path', type: 'integer', description: 'Role ID — auto-bound to Role model' }],
    responses: [{ status: 200, description: 'Role with permissions' }, { status: 404, description: 'Not found' }],
  })
  async show(_req: Request, res: Response, role: Role): Promise<void> {
    res.json({ success: true, data: role });
  }

  @Doc({
    summary: 'Create a new role',
    tags: ['Roles'],
    auth: true,
    body: {
      name: { type: 'string', description: 'Display name' },
      slug: { type: 'string', description: 'Unique slug (e.g. editor)' },
      description: { type: 'string', required: false, description: 'Optional description' },
    },
  })
  async store(req: StoreRoleRequest, res: Response): Promise<void> {
    const data = req.validated();
    res.status(201).json({ success: true, data: await this.roleService.create(data) });
  }

  @Doc({ summary: 'Update a role', tags: ['Roles'], auth: true })
  async update(req: UpdateRoleRequest, res: Response, role: Role): Promise<void> {
    const data = req.validated();
    await role.update({ ...data, updated_at: new Date() });
    res.json({ success: true, data: role });
  }

  @Doc({ summary: 'Delete a role (soft delete)', tags: ['Roles'], auth: true })
  async destroy(_req: Request, res: Response, role: Role): Promise<void> {
    await role.delete();
    res.json({ success: true, message: 'Role deleted' });
  }

  @Doc({
    summary: 'Sync permissions to a role',
    tags: ['Roles'],
    auth: true,
    body: { permission_ids: { type: 'array', description: 'Array of permission IDs' } },
  })
  async syncPermissions(req: SyncPermissionsRequest, res: Response, role: Role): Promise<void> {
    const { permission_ids } = req.validated();
    await (role as RoleWithPermissions).permissions().sync(permission_ids);
    res.json({ success: true, data: role });
  }
}
