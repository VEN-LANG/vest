import { FormRequest } from '@lara-node/core';

export class StoreRoleRequest extends FormRequest<{ name: string; slug: string; description?: string }> {
  rules() {
    return {
      name: 'required|string|min:2|max:100',
      slug: 'required|string|min:2|max:100',
      description: 'nullable|string',
    };
  }
}
