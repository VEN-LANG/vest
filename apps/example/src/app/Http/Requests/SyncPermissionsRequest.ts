import { FormRequest } from '@lara-node/core';

export class SyncPermissionsRequest extends FormRequest<{ permission_ids: string[] }> {
  authorize(): boolean { return true; }

  rules() {
    return {
      permission_ids: 'required|array',
      'permission_ids.*': 'required|string|exists:permissions,id',
    };
  }
}
