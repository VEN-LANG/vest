import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Injectable } from '@lara-node/core';
import User from '../Models/User/User';

@Injectable()
export class AuthService {
  async register(data: { name: string; email: string; password: string }) {
    const existing = await User.where('email', data.email).first();
    if (existing) throw Object.assign(new Error('Email already registered'), { status: 422 });

    const password = await bcrypt.hash(data.password, 12);
    return User.create({ ...data, password, status: 'active', created_at: new Date(), updated_at: new Date() });
  }

  async login(email: string, password: string) {
    const user = await User.where('email', email).first() as User | null;
    if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const secret = process.env.JWT_SECRET ?? 'dev-secret-change';
    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];
    const token = jwt.sign({ sub: user.id }, secret, { expiresIn });

    await user.update({ last_login: new Date(), last_seen_at: new Date() });
    return { token, user };
  }

  async me(userId: number | string) {
    return User.with(['profile', 'roles', 'roles.permissions']).find(userId);
  }
}
