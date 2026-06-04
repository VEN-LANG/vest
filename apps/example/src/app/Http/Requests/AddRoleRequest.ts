import { FormRequest } from '@lara-node/core';

export class AddRoleRequest extends FormRequest<{ role_id: string | number }> {
  authorize(): boolean { return true; }

  rules() {
    return {
      role_id: 'required|string|exists:roles,id',
    };
  }
}
