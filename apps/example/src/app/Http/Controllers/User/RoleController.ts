import type { Request, Response } from "express";
import { RoleService } from "@app/Services/RoleService";
import { ValidationError } from "@app/Helpers/validator";
import { Role } from "@app/Models/User";
import { Doc } from "@vest/router";

const roleFields = ["name", "slug", "description"];

function makeSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export class RoleController {
  public constructor(public roleService: RoleService) {}

  @Doc({
    summary: "List all roles",
    tags: ["Roles"],
  })
  async index(req: Request, res: Response) {
    res.json(await this.roleService.list());
  }

  @Doc({
    summary: "Get role by ID",
    tags: ["Roles"],
    responses: [
      { status: 200, description: "Role found" },
      { status: 404, description: "Not found" },
    ],
  })
  async show(req: Request, res: Response, role: Role) {
    let validated: any;
    if (!role) {
      try {
        validated = await req.validate({ id: req.params.role }, { id: "required|exists:roles,id" });
      } catch (e) {
        if (e instanceof ValidationError)
          return res.status(422).json({ errors: e.errors, messages: e.messages });
        throw e;
      }
    } else {
      await role.load("permissions");
      res.json(role);
    }
    const item = await this.roleService.find((role?.id as any) || validated?.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  }

  @Doc({
    summary: "Create a new role",
    tags: ["Roles"],
    validationRules: {
      name: "required|string|max:191",
      slug: "nullable|string|max:191",
      description: "nullable|string",
    },
    responses: [
      { status: 201, description: "Role created" },
      { status: 422, description: "Validation error" },
    ],
  })
  async store(req: Request, res: Response) {
    const rules: any = {
      name: "required|string|max:191",
      slug: "nullable|string|max:191|unique:roles,slug",
      description: "nullable|string",
    };
    try {
      const validated = (await req.validate(rules)) as any;
      if (!validated.slug && validated.name) validated.slug = makeSlug(validated.name);
      const clean: any = {};
      roleFields.forEach((f) => {
        if (validated[f] !== undefined) clean[f] = validated[f];
      });
      const created = await this.roleService.create(clean);
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
  }

  @Doc({
    summary: "Update a role",
    tags: ["Roles"],
    validationRules: {
      name: "nullable|string|max:191",
      slug: "nullable|string|max:191",
      description: "nullable|string",
    },
    responses: [
      { status: 200, description: "Role updated" },
      { status: 404, description: "Not found" },
      { status: 422, description: "Validation error" },
    ],
  })
  async update(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      await req.validate({ id }, { id: "required|exists:roles,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    const rules: any = {
      name: "nullable|string|max:191",
      slug: "nullable|string|max:191|unique:roles,slug," + id,
      description: "nullable|string",
    };
    try {
      const validated = (await req.validate(rules)) as any;
      if (validated.name && !validated.slug) validated.slug = makeSlug(validated.name);
      const clean: any = {};
      roleFields.forEach((f) => {
        if (validated[f] !== undefined) clean[f] = validated[f];
      });
      const item = await this.roleService.update(id, clean);
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json(item);
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
  }

  @Doc({
    summary: "Delete a role",
    tags: ["Roles"],
    responses: [
      { status: 200, description: "Role deleted" },
      { status: 404, description: "Not found" },
    ],
  })
  async destroy(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      await req.validate({ id }, { id: "required|exists:roles,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    const ok = await this.roleService.delete(id);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  }

  @Doc({
    summary: "Sync permissions for a role",
    tags: ["Roles"],
    validationRules: { permissions: "required|array" },
    responses: [
      { status: 200, description: "Permissions synced" },
      { status: 404, description: "Not found" },
      { status: 422, description: "Validation error" },
    ],
  })
  async syncPermissions(req: Request, res: Response) {
    const id = req.params.id as string;
    const rules: any = { permissions: "required|array" };
    try {
      await req.validate({ id }, { id: "required|exists:roles,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    let validated: any;
    try {
      validated = await req.validate(rules);
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    const ids = validated.permissions ?? [];
    const updated = await this.roleService.attachPermissions(id, ids);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  }
}
