import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Doc } from '@lara-node/router';
import { PermissionService } from '@app/Services/index';

@Injectable()
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Doc({ summary: 'List all permissions', tags: ['Permissions'], auth: true })
  async index(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: await this.permissionService.index() });
  }

  @Doc({ summary: 'Get a permission by ID', tags: ['Permissions'], auth: true, params: [{ name: 'id', in: 'path', type: 'integer' }] })
  async show(req: Request, res: Response): Promise<void> {
    const p = await this.permissionService.find(req.params.id);
    if (!p) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: p });
  }
}
