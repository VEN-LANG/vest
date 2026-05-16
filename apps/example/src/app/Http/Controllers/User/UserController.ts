import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Injectable } from "@lara-node/core";
import { UserService } from "@app/Services/UserService";
import { parseRequest } from "@app/Helpers/auth";
import { ValidationError } from "@app/Helpers/validator";
import User from "@app/Models/User/User";
import { TProfile, TUser } from "@app/Http/types";
import { Doc } from "@lara-node/router";

/*
|--------------------------------------------------------------------------
| User Controller
|--------------------------------------------------------------------------
|
| This controller handles HTTP requests for user management including
| CRUD operations, profile management, role assignments, and passwords.
|
*/

@Injectable()
export class UserController {
  public constructor(public userService: UserService) {}

  @Doc({
    summary: "List users",
    tags: ["Users"],
    params: [
      { name: "search", in: "query", description: "Search term", type: "string" },
      { name: "page", in: "query", description: "Page number", type: "integer" },
      { name: "limit", in: "query", description: "Items per page", type: "integer" },
      { name: "sort", in: "query", description: "Sort field", type: "string" },
      {
        name: "order",
        in: "query",
        description: "Sort direction",
        type: "string",
        enum: ["asc", "desc"],
      },
    ],
  })
  async index(req: Request, res: Response) {
    const queryRules: any = {
      search: "nullable|string",
      page: "nullable|int",
      limit: "nullable|int",
      sort: "nullable|string",
      order: "nullable|string|in:asc,desc",
    };
    try {
      await (req as any).validate(req.query, queryRules);
    } catch (e) {
      /* soft fail on query validation */
    }
    const data = await this.userService.list(parseRequest(req));
    res.json(data);
  }

  @Doc({
    summary: "Get user by ID",
    tags: ["Users"],
    responses: [
      { status: 200, description: "User found" },
      { status: 404, description: "Not found" },
    ],
  })
  async show(req: Request, res: Response) {
    try {
      await req.validate({ id: req.params.id }, { id: "required|exists:users,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    const item = await this.userService.find(req.params.id as any);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  }

  @Doc({
    summary: "Get user profile",
    tags: ["Users"],
    responses: [
      { status: 200, description: "Profile found" },
      { status: 404, description: "Not found" },
    ],
  })
  async showProfile(req: Request, res: Response) {
    try {
      await req.validate({ id: req.params.id }, { id: "required|exists:users,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    const profile = await this.userService.getProfile(req.params.id as any);
    if (!profile) return res.status(404).json({ message: "Not found" });
    res.json(profile);
  }

  @Doc({
    summary: "Create user",
    tags: ["Users"],
    validationRules: {
      name: "required|string|max:255",
      email: "required|email|max:255",
      password: "required|string|min:6",
      phone_number: "required|string|max:25",
      active_status: "nullable|int",
      roles: "nullable|array",
    },
    responses: [
      { status: 201, description: "User created" },
      { status: 422, description: "Validation error" },
    ],
  })
  async store(req: Request, res: Response) {
    const rules = {
      name: "required|string|max:255",
      email: "required|email|max:255|unique:users,email",
      password: "required|string|min:6|confirmed",
      phone_number: "required|string|phone|max:25",
      active_status: "nullable|int",
      profile: "nullable",
      roles: "nullable|array",
      "roles.*": "nullable|exists:roles,id",
    } as any;

    try {
      let validated = (await req.validate(rules)) as any as Partial<TUser>;

      if (validated.password) {
        validated.password = await bcrypt.hash(validated.password, 10);
      }
      delete (validated as any).confirm_password;

      const item = await this.userService.create(validated as any);

      if (validated.roles) {
        await item.roles().attach(validated.roles);
      }

      if (validated.profile) {
        const profileData = validated.profile;
        delete validated.profile;

        const profileValidated = (await req.validate(
          { ...(profileData ?? {}) },
          {
            gender: "nullable|string|in:male,female",
            type: "nullable|string|max:50|in:admin,user,staff,agent",
            id_number: "nullable|string|max:100",
            city: "nullable|string|max:100",
            country: "nullable|string|max:100",
            address: "nullable|string|max:255",
            zip_code: "nullable|string|max:20",
            date_of_birth: "nullable|date",
            metadata: "nullable",
          },
        )) as any as Partial<TProfile>;

        await this.userService.updateProfile((item as any).id, profileValidated as TProfile);
      }

      res.status(201).json(item);
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      res.status(500).json({
        message: (e as any).message || "Internal server error",
        error: { message: (e as any).message },
      });
    }
  }

  @Doc({
    summary: "Update user",
    tags: ["Users"],
    validationRules: {
      name: "nullable|string|max:255",
      email: "nullable|email|max:255",
      password: "nullable|string|min:6",
      phone_number: "nullable|string|max:25",
      active_status: "nullable|int",
    },
    responses: [
      { status: 200, description: "User updated" },
      { status: 404, description: "Not found" },
      { status: 422, description: "Validation error" },
    ],
  })
  async update(req: Request, res: Response) {
    const rules: any = {
      name: "nullable|string|max:255",
      email: "nullable|email|max:255",
      password: "nullable|string|min:6|confirmed",
      confirm_password: "nullable|string|min:6",
      phone_number: "nullable|string|max:25",
      active_status: "nullable|int",
    };

    let validated: any;
    try {
      validated = await req.validate(rules);
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }

    if (validated.password) {
      if (validated.password !== req.body.confirm_password)
        return res.status(400).json({ message: "Passwords do not match" });
      validated.password = await bcrypt.hash(validated.password, 10);
    }
    delete validated.confirm_password;

    const item = await this.userService.update(req.params.id as any, validated);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  }

  @Doc({
    summary: "Update user profile",
    tags: ["Users"],
    validationRules: {
      gender: "nullable|string|in:male,female",
      type: "nullable|string|max:50|in:admin,staff,user,agent",
      id_number: "nullable|string|max:100",
      city: "nullable|string|max:100",
      country: "nullable|string|max:100",
      address: "nullable|string|max:255",
      zip_code: "nullable|string|max:20",
      date_of_birth: "nullable|date",
    },
    responses: [
      { status: 200, description: "Profile updated" },
      { status: 404, description: "Not found" },
      { status: 422, description: "Validation error" },
    ],
  })
  async updateProfile(req: Request, res: Response) {
    const rules: any = {
      gender: "nullable|string|in:male,female",
      type: "nullable|string|max:50|in:admin,staff,user,agent",
      id_number: "nullable|string|max:100",
      city: "nullable|string|max:100",
      country: "nullable|string|max:100",
      address: "nullable|string|max:255",
      zip_code: "nullable|string|max:20",
      date_of_birth: "nullable|date",
    };

    let validated: any;
    try {
      validated = await req.validate(rules);
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }

    const profile = await this.userService.updateProfile(req.params.id as any, validated);
    if (!profile) return res.status(404).json({ message: "Not found" });
    res.json(profile);
  }

  @Doc({
    summary: "Add role to user",
    tags: ["Users"],
    validationRules: { role_id: "required|int" },
    responses: [
      { status: 200, description: "Role added" },
      { status: 404, description: "User not found" },
      { status: 422, description: "Validation error" },
    ],
  })
  async addRole(req: Request, res: Response) {
    const userId = req.params.id;
    const rules = {
      role_id: "required|exists:roles,id",
      user_id: "required|exists:users,id",
    } as any;

    try {
      await req.validate({ role_id: req.body.role_id, user_id: userId }, rules);
      const updated = await this.userService.addRole(userId as any, req.body.role_id);
      if (!updated) return res.status(404).json({ message: "User not found" });
      return res.json(updated);
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
  }

  @Doc({
    summary: "Remove role from user",
    tags: ["Users"],
    responses: [
      { status: 200, description: "Role removed" },
      { status: 404, description: "User not found" },
      { status: 422, description: "Validation error" },
    ],
  })
  async removeRole(req: Request, res: Response) {
    const userId = req.params.id;
    const roleId = req.params.roleId;

    try {
      await req.validate({ role_id: roleId }, { role_id: "required|exists:roles,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }

    const updated = await this.userService.removeRole(userId as any, roleId as any);
    if (!updated) return res.status(404).json({ message: "User not found" });
    return res.json(updated);
  }

  @Doc({
    summary: "Toggle user active/inactive status",
    description: "Toggles the user active/inactive status.",
    tags: ["Users"],
    responses: [{ status: 200, description: "Status toggled" }],
  })
  async toggleStatus(req: Request, res: Response, user: User) {
    if (user) {
      user = await user.update({
        status: user.status === "active" ? "inactive" : "active",
      });
    }
    return res.jsonAsync(user);
  }

  @Doc({
    summary: "Set user password (admin)",
    tags: ["Users"],
    validationRules: {
      password: "required|string|min:6",
      confirm_password: "required|string|min:6",
    },
    responses: [
      { status: 200, description: "Password updated" },
      { status: 404, description: "Not found" },
      { status: 422, description: "Validation error" },
    ],
  })
  async setPassword(req: Request, res: Response) {
    const rules = {
      password: "required|string|min:6|confirmed",
      confirm_password: "required|string|min:6",
    };

    try {
      await req.validate(rules);
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }

    const { password } = req.body || {};
    const hashed = await bcrypt.hash(password, 10);
    const user = await this.userService.setPassword(req.params.id as any, hashed);
    if (!user) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  }

  @Doc({
    summary: "Reset own password",
    tags: ["Users"],
    validationRules: {
      password: "required|string|min:6",
      confirm_password: "required|string|min:6",
    },
    responses: [
      { status: 200, description: "Password reset" },
      { status: 401, description: "Unauthorized" },
      { status: 403, description: "Forbidden" },
      { status: 404, description: "Not found" },
    ],
  })
  async resetPassword(req: Request, res: Response) {
    const rules = {
      password: "required|string|min:6|confirmed",
      confirm_password: "required|string|min:6",
    };

    try {
      await req.validate(rules);
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }

    const { password } = req.body || {};
    const requester = (req as any).user;

    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const isOwner = String(requester.id) === String(req.params.id);
    const hasManage = (requester.permissions || []).includes("update_users");

    if (!isOwner && !hasManage) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.userService.setPassword(req.params.id as any, hashed);
    if (!user) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  }

  @Doc({
    summary: "Delete user",
    tags: ["Users"],
    responses: [
      { status: 200, description: "User deleted" },
      { status: 404, description: "Not found" },
    ],
  })
  async destroy(req: Request, res: Response) {
    try {
      await req.validate({ id: req.params.id }, { id: "required|exists:users,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }

    const ok = await this.userService.delete(req.params.id as any);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  }
}
