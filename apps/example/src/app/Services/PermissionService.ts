import { Injectable } from '@lara-node/core';
import Permission from '../Models/User/Permission';

@Injectable()
export class PermissionService {
  async index() { return Permission.all(); }
  async find(id: number | string) { return Permission.find(id); }
}
