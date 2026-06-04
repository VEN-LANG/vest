import { FormRequest } from '@lara-node/core';

export class UpdateRoleRequest extends FormRequest<{ name?: string; slug?: string; description?: string }> {
  authorize(): boolean { return true; }

  rules() {
    return {
      name: 'sometimes|string|min:2|max:100',
      slug: 'sometimes|string|min:2|max:100|unique:roles,slug,' + this.input('role'),
      description: 'nullable|string',
    };
  }
}
