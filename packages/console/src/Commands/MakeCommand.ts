import { Command, CommandArguments, CommandOptions,  } from "Command.js";
import path from "path";
import fs from "fs";

import { ArgumentsCamelCase } from "yargs";

export class MakeController extends Command {
  protected signature: string = "make:controller";
  protected description: string = "make a controller";

  protected arguments: CommandArguments | undefined = {
    name: { type: "string", description: "The name of the controller", required: true },
  };
  protected options: CommandOptions | undefined = {
    resource: { type: "boolean", description: "Create a resource", alias: 'r', default: true },
    model: { type: "string", description: "Model to create resource from ", alias: 'm' }
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);

    // Ensure name ends with 'Seeder'
    if (!name.toLowerCase().endsWith("controller")) {
      name = name + "Controller";
    }

    // Capitalize first letter
    name = name.charAt(0).toUpperCase() + name.slice(1);

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/app/Http/Controller");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      this.error(`Controller ${fileName} already exists!`);
      process.exit(1);
    }

    const template = this.getTemplate(name);
    fs.writeFileSync(filePath, template);
    this.success(`Created controller: ${fileName}`);

  }

  private getTemplate(name: string, resource?: boolean): string {
    let modelName = name.slice(0,1).toUpperCase() + name.slice(1)
    let resourceContent: string = `
 @Route.get("/")
  async index() {
    return ${modelName}.all();
  }

  @Route.get("/:id")
  async show(req: Request) {
    return ${modelName}.find(req.params.id);
  }

  @Route.post("/")
  async store(req: Request) {
    return ${modelName}.create(req.body);
  }

  @Route.put("/:id")
  async update(req: Request) {
    const ${modelName.toLowerCase()} = await ${modelName}.find(req.params.id);
    return ${modelName.toLowerCase()}.update(req.body);
  }

  @Route.delete("/:id")
  async destroy(req: Request) {
    const ${modelName.toLowerCase()} = await ${modelName}.find(req.params.id);
    await ${modelName.toLowerCase()}.delete();
    return { message: "Deleted" };
  }
    `
    return `
import { Route } from "@lara-node/router";

@Route("/api/${name}")
class ${name}Controller {
  ${resource ? resourceContent : '' }  
}
    `;
  }
}
