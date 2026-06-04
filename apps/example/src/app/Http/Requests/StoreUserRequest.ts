import { FormRequest } from '@lara-node/core';

export class StoreUserRequest extends FormRequest<{ name: string; email: string; password: string }> {
  rules() {
    return {
      name: 'required|string|min:2|max:100',
      email: 'required|email',
      password: 'required|string|min:8',
    };
  }
}
