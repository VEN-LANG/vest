import { Command, CommandArguments, CommandOptions } from "Command.js";
import path from "path";
import fs from "fs";
import { ArgumentsCamelCase } from "yargs";

export class MakeController extends Command {
  protected signature: string = "make:controller";
  protected description: string = "Create a new controller class";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the controller", required: true },
  };

  protected options: CommandOptions | undefined = {
    resource: { type: "boolean", description: "Generate a resource controller (CRUD)", alias: "r", default: false },
    model: { type: "string", description: "Model to scaffold resource from", alias: "m" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    if (!name.toLowerCase().endsWith("controller")) {
      name = name.charAt(0).toUpperCase() + name.slice(1) + "Controller";
    } else {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/app/Http/Controllers");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Controller ${fileName} already exists!`);
      process.exit(1);
    }

    const isResource = args.resource === true;
    const modelName = args.model ? String(args.model) : name.replace(/Controller$/, "");
    const template = this.getTemplate(name, isResource, modelName);
    fs.writeFileSync(filePath, template);
    this.success(`Created controller: ${fileName}`);
  }

  private getTemplate(name: string, resource: boolean, modelName: string): string {
    const modelVar = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const prefix = `/${modelVar}s`;

    if (!resource) {
      return `import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Route } from '@lara-node/router';
import { Controller } from './Controller';

@Route('${prefix}')
@Injectable()
export class ${name} extends Controller {
  @Route.get('/')
  async index(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: [] });
  }
}
`;
    }

    return `import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Route } from '@lara-node/router';
import { Controller } from './Controller';

@Route('${prefix}', 'auth')
@Injectable()
export class ${name} extends Controller {
  @Route.get('/')
  async index(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: [] });
  }

  @Route.get('/:id')
  async show(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: null });
  }

  @Route.post('/')
  async store(req: Request, res: Response): Promise<void> {
    res.status(201).json({ success: true, data: req.body });
  }

  @Route.put('/:id')
  async update(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: req.body });
  }

  @Route.delete('/:id')
  async destroy(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Deleted' });
  }
}
`;
  }
}
