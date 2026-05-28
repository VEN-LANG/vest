import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Doc } from '@lara-node/router';
import { PermissionService } from '@app/Services/index';
import Permission from '@app/Models/User/Permission';

@Injectable()
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Doc({ summary: 'List all permissions', tags: ['Permissions'], auth: true })
  async index(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: await this.permissionService.index() });
  }

  @Doc({
    summary: 'Get a permission by ID (route-model binding)',
    description: 'The :permission parameter is automatically resolved to a Permission model instance.',
    tags: ['Permissions'],
    auth: true,
    params: [{ name: 'permission', in: 'path', type: 'integer', description: 'Permission ID — auto-bound to Permission model' }],
    responses: [{ status: 200, description: 'Permission' }, { status: 404, description: 'Not found' }],
  })
  async show(_req: Request, res: Response, permission: Permission): Promise<void> {
    res.json({ success: true, data: permission });
  }
}
