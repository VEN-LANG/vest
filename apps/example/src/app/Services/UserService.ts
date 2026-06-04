import { Injectable } from '@lara-node/core';
import User from '../Models/User/User';
import UserProfile from '../Models/User/UserProfile';

@Injectable()
export class UserService {
  async index(page = 1, perPage = 15) {
    return User.with(['profile', 'roles']).paginate(perPage, page);
  }

  async find(id: number | string) {
    return User.with(['profile', 'roles', 'roles.permissions']).find(id);
  }

  async create(data: Record<string, unknown>) {
    return User.create({ ...data, created_at: new Date(), updated_at: new Date() });
  }

  async update(id: number | string, data: Record<string, unknown>) {
    const user = await User.find(id) as User | null;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    await user.update({ ...data, updated_at: new Date() });
    return user;
  }

  async destroy(id: number | string) {
    const user = await User.find(id) as User | null;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    await user.delete();
  }

  async addRole(userId: number | string, roleId: number | string) {
    const user = await User.with(['roles']).find(userId) as User | null;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    await (user as User & { roles: () => { attach: (ids: (number | string)[]) => Promise<void> } }).roles().attach([roleId]);
    return user;
  }

  async removeRole(userId: number | string, roleId: number | string) {
    const user = await User.find(userId) as User | null;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    await (user as User & { roles: () => { detach: (ids: (number | string)[]) => Promise<void> } }).roles().detach([roleId]);
  }

  async toggleStatus(userId: number | string) {
    const user = await User.find(userId) as User | null;
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    const current = user.status;
    const newStatus = current === 'active' ? 'inactive' : 'active';
    await user.update({ status: newStatus, updated_at: new Date() });
    return user;
  }

  async updateProfile(userId: number | string, data: Record<string, unknown>) {
    let profile = await UserProfile.where('user_id', userId).first() as UserProfile | null;
    if (profile) {
      await profile.update({ ...data, updated_at: new Date() });
    } else {
      profile = await UserProfile.create({ user_id: userId, ...data, created_at: new Date(), updated_at: new Date() }) as UserProfile;
    }
    return profile;
  }
}
