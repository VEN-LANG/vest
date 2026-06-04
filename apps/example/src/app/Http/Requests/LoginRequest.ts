import { FormRequest } from '@lara-node/core';

export class LoginRequest extends FormRequest<{ email: string; password: string }> {
  authorize(): boolean { return true; }

  rules() {
    return {
      email: 'required|email|exists:users,email',
      password: 'required|string|min:6',
    };
  }
}
