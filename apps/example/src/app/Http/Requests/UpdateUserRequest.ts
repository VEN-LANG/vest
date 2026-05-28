import { FormRequest } from '@lara-node/core';

export class UpdateUserRequest extends FormRequest<{ name?: string; email?: string }> {
  authorize(): boolean { return true; }

  rules() {
    return {
      name: 'sometimes|string|min:2|max:100',
      email: 'sometimes|email|unique:users,email,' + this.input('user'),
      phone_number: 'sometimes|string|max:32',
      status: 'sometimes|string|in:active,inactive',
    };
  }
}
