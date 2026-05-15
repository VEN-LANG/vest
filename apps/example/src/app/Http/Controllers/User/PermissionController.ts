import type { Request, Response } from "express";
import { PermissionService } from "@app/Services/PermissionService";
import { ValidationError } from "@app/Helpers/validator";
import { Doc } from "@vest-ts/router";

export class PermissionController {
  public constructor(public permissionService: PermissionService) {}

  @Doc({
    summary: "List all permissions",
    tags: ["Permissions"],
    params: [{ name: "search", in: "query", description: "Search term", type: "string" }],
  })
  async index(req: Request, res: Response) {
    const rules: any = { search: "nullable|string" };
    try {
      await (req as any).validate(req.query, rules);
    } catch (_) {}
    res.json(await this.permissionService.list());
  }

  @Doc({
    summary: "Get permission by ID",
    tags: ["Permissions"],
    responses: [
      { status: 200, description: "Permission found" },
      { status: 404, description: "Not found" },
      { status: 422, description: "Validation error" },
    ],
  })
  async show(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      await req.validate({ id }, { id: "required|exists:permissions,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    const item = await this.permissionService.find(id);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  }
}
