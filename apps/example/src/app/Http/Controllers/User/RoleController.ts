import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Doc } from '@lara-node/router';
import { RoleService } from '@app/Services/index';
import Role from '@app/Models/User/Role';

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
  async show(req: Request, res: Response): Promise<void> {
    // req.params.role is already a loaded Role model instance (route-model binding via ModelRegistry)
    const role = req.params.role as unknown as Role;
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
  async store(req: Request, res: Response): Promise<void> {
    const data = await req.validate({
      name: 'required|string|min:2|max:100',
      slug: 'required|string|min:2|max:100',
      description: 'nullable|string',
    });
    res.status(201).json({ success: true, data: await this.roleService.create(data) });
  }

  @Doc({ summary: 'Update a role', tags: ['Roles'], auth: true })
  async update(req: Request, res: Response): Promise<void> {
    const data = await req.validate<{ name?: string; slug?: string; description?: string }>({
      name: 'sometimes|string|min:2|max:100',
      slug: 'sometimes|string|min:2|max:100',
      description: 'nullable|string',
    });
    res.json({ success: true, data: await this.roleService.update(req.params.id, data) });
  }

  @Doc({ summary: 'Delete a role (soft delete)', tags: ['Roles'], auth: true })
  async destroy(req: Request, res: Response): Promise<void> {
    await this.roleService.destroy(req.params.id);
    res.json({ success: true, message: 'Role deleted' });
  }

  @Doc({
    summary: 'Sync permissions to a role',
    tags: ['Roles'],
    auth: true,
    body: { permission_ids: { type: 'array', description: 'Array of permission IDs' } },
  })
  async syncPermissions(req: Request, res: Response): Promise<void> {
    const { permission_ids } = await req.validate<{ permission_ids: number[] }>({ permission_ids: 'required|array' });
    res.json({ success: true, data: await this.roleService.syncPermissions(req.params.id, permission_ids) });
  }
}
