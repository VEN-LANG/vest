import { FormRequest } from '@lara-node/core';

export class SetPasswordRequest extends FormRequest<{ password: string }> {
  rules() {
    return {
      password: 'required|string|min:8',
    };
  }
}
