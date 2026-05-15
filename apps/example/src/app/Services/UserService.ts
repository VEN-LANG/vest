import { ModelAttributes } from "@vest-ts/db";
import { TProfile, TRequest } from "@app/Http/types";
import User from "@app/Models/User/User";
import UserProfile from "@app/Models/User/UserProfile";
import Role from "@app/Models/User/Role";
import { RolesUsers } from "@app/Models/User/RolesUsers";
import { event } from "@vest-ts/events";

/*
|--------------------------------------------------------------------------
| User Service
|--------------------------------------------------------------------------
|
| This service handles all user-related business logic including CRUD
| operations, profile management, and role assignments.
|
*/

export class UserService {
  /**
   * List users with optional filtering and pagination
   */
  async list(request: TRequest) {
    const { query } = request;
    let users = User.query().with(["profile", "roles", "roles.permissions"]);

    if (query.search) {
      users
        .where("name", "like", `%${query.search}%`)
        .orWhere("email", "like", `%${query.search}%`)
        .orWhere("phone_number", "like", `%${query.search}%`);
    }

    if (query.sort) {
      users.orderBy(query.sort, query.order || "asc");
    }

    if (query.deleted) {
      users.onlyTrashed();
    }

    if (query.role) {
      users = users.whereHas("roles", (builder) => {
        builder
          .where("id", "=", query.role)
          .orWhere("name", "=", query.role)
          .orWhere("slug", "=", query.role);
      });
    }

    if (query.type) {
      users = users.whereHas("profile", (q) => {
        q.where("type", "=", query.type);
      });
    }

    return await users.paginate(query.limit, query.page);
  }

  /**
   * Find a user by ID
   */
  async find(id: number | string) {
    return await User.with(["profile", "roles", "roles.permissions"]).findOrFail(id);
  }

  /**
   * Create a new user
   */
  async create(data: ModelAttributes): Promise<User> {
    const existingUser = await User.query()
      .where("email", "=", data.email)
      .orWhere("phone_number", "=", data.phone_number)
      .first();

    if (existingUser) {
      throw new Error("User already exists");
    }

    const user_ = await User.create(data);

    // Dispatch event - listeners will handle sending welcome email
    await event("user.registered", {
      userId: user_.id,
      email: user_.email,
      name: user_.name,
    });

    return user_;
  }

  /**
   * Update an existing user
   */
  async update(id: number | string, data: ModelAttributes) {
    const user = await User.find(id);
    if (!user) return null;
    await (user as any).update(data);
    return user;
  }

  /**
   * Delete a user (soft delete)
   */
  async delete(id: number | string) {
    const user = await User.find(id);
    if (!user) return false;
    await user.delete();
    return true;
  }

  /**
   * Get a user's profile
   */
  async getProfile(userId: number | string) {
    try {
      const user = await User.with([
        "profile",
        "profile.user",
        "profile.user.roles",
        "profile.user.roles.permissions",
      ]).find(userId);

      if (!user) return null;
      return (user.toJSON() as any).profile || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Update or create a user's profile
   */
  async updateProfile(userId: number | string, data: TProfile) {
    const user = await User.find(userId);
    if (!user) return null;

    let profile = await UserProfile.where("user_id", "=", userId).first();

    if (profile) {
      await (profile as any).update(data);
      return profile;
    }

    // Create new profile
    const attrs = { ...data, user_id: userId } as any;
    return await UserProfile.create(attrs);
  }

  /**
   * Set a user's password
   */
  async setPassword(userId: number | string, hashedPassword: string) {
    const user = await User.find(userId);
    if (!user) return null;
    await (user as any).update({ password: hashedPassword });
    return user;
  }

  /**
   * Remove a role from a user
   */
  async removeRole(userId: number | string, roleId: number | string) {
    const user = await User.find(userId);
    if (!user) return null;

    await RolesUsers.query().where("roles_id", roleId).where("users_id", userId).delete();

    return await User.with(["profile", "roles", "roles.permissions"]).find(userId);
  }

  /**
   * Add a role to a user
   */
  async addRole(userId: number | string, roleId: number | string) {
    const user = await User.find(userId);
    if (!user) return null;

    const role = await Role.find(roleId);
    if (!role) throw new Error("Role not found");

    const existing = await RolesUsers.query()
      .where("users_id", userId)
      .where("roles_id", roleId)
      .exists();

    if (!existing) {
      await RolesUsers.create({ users_id: userId, roles_id: roleId });
    }

    return await User.with(["profile", "roles", "roles.permissions"]).find(userId);
  }
}

export default new UserService();
