import { Command } from "@lara-node/console";
import { ArgumentsCamelCase } from "yargs";
import { initDatabase } from "../../../config/db.config.js";

interface PermissionDef {
  slug: string;
  name: string;
  description?: string;
}

// Central permission registry. Keep this in sync with routes' authorizePermissions() calls.
const PERMISSIONS: PermissionDef[] = [
  // Users
  { slug: "view_users", name: "View Users", description: "Can list and view user records" },
  { slug: "create_users", name: "Create Users", description: "Can create new users" },
  { slug: "update_users", name: "Update Users", description: "Can update existing users" },
  { slug: "delete_users", name: "Delete Users", description: "Can delete users" },
  { slug: "add_roles_to_users", name: "Add Roles To Users", description: "Can Add Roles To Users" },
  {
    slug: "remove_roles_from_users",
    name: "Remove Roles From Users",
    description: "Can Remove Roles From Users",
  },
  {
    slug: "activate_and_deactivate_users",
    name: "Activate and Deactivate Users",
    description: "Can activate and deactivate users",
  },

  // Roles
  { slug: "view_roles", name: "View Roles", description: "Can list and view roles" },
  { slug: "create_roles", name: "Create Roles", description: "Can create roles" },
  { slug: "update_roles", name: "Update Roles", description: "Can update roles" },
  { slug: "delete_roles", name: "Delete Roles", description: "Can delete roles" },
  {
    slug: "add_permissions_to_roles",
    name: "Add Permissions to Roles",
    description: "Can attach/detach permissions for a role",
  },

  // Permissions
  {
    slug: "view_permissions",
    name: "View Permissions",
    description: "Can list and view permissions",
  },
  {
    slug: "create_permissions",
    name: "Create Permissions",
    description: "Can create new permissions",
  },
  { slug: "update_permissions", name: "Update Permissions", description: "Can update permissions" },
  { slug: "delete_permissions", name: "Delete Permissions", description: "Can delete permissions" },

  // Files
  { slug: "view_files", name: "View Files", description: "Can list and view files" },
  { slug: "upload_files", name: "Upload Files", description: "Can upload new files" },
  { slug: "delete_files", name: "Delete Files", description: "Can delete files" },
];

export class PermissionsSyncCommand extends Command {
  protected signature = "permissions:sync";
  protected description = "Sync permissions to database and attach all to admin role";

  protected options = {
    "dry-run": {
      type: "boolean" as const,
      description: "Show what would be synced without making changes",
      default: false,
    },
    force: {
      type: "boolean" as const,
      description: "Force sync even in production",
      default: false,
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const dryRun = args.dryRun as boolean;
    const force = args.force as boolean;

    // Production check
    if (process.env.NODE_ENV === "production" && !force) {
      this.error("Cannot sync permissions in production without --force flag");
      return;
    }

    if (dryRun) {
      this.info("Dry run mode - no changes will be made");
      this.line("");
    }

    this.info("Syncing permissions...");

    try {
      // Initialize database connection
      await initDatabase();

      const { Permission } = await import("../../Models/User/Permission.js");
      const { Role } = await import("../../Models/User/Role.js");

      const now = new Date();
      let created = 0;
      let updated = 0;
      const syncedPerms: any[] = [];

      // Upsert all permissions
      for (const p of PERMISSIONS) {
        let perm = await Permission.where("slug", p.slug).first();

        if (perm) {
          if (!dryRun) {
            await perm.update({
              name: p.name,
              description: p.description || "",
              updated_at: now,
            });
          }
          updated++;
          syncedPerms.push(perm);
          this.line(`  ${this.colorYellow("UPDATE")} ${p.slug}`);
        } else {
          if (!dryRun) {
            perm = await Permission.create({
              name: p.name,
              slug: p.slug,
              description: p.description || "",
              created_at: now,
              updated_at: now,
            });
          }
          created++;
          syncedPerms.push(perm);
          this.line(`  ${this.colorGreen("CREATE")} ${p.slug}`);
        }
      }

      this.line("");

      // Ensure admin role exists and attach all permissions
      let adminRole = await Role.where("slug", "admin").first();
      if (!adminRole) {
        if (!dryRun) {
          adminRole = await Role.create({
            name: "Admin",
            slug: "admin",
            description: "Administrator role with all permissions",
            created_at: now,
            updated_at: now,
          });
        }
        this.line(`${this.colorGreen("CREATE")} Admin role`);
      }

      // Attach all permissions to admin role
      if (!dryRun && adminRole && syncedPerms.length > 0) {
        const permIds = syncedPerms.map((p: any) => p?.id).filter(Boolean);

        if (permIds.length > 0) {
          try {
            await (adminRole as any).permissions().sync(permIds);
          } catch (e) {
            await (adminRole as any).permissions().attach(permIds);
          }
        }
      }

      this.line("");
      this.info("Summary:");
      this.line(`  Created: ${this.colorGreen(String(created))}`);
      this.line(`  Updated: ${this.colorYellow(String(updated))}`);
      this.line(`  Total:   ${PERMISSIONS.length}`);
      this.line("");

      if (dryRun) {
        this.warn("Dry run complete - no changes were made");
      } else {
        this.info(`Successfully synced ${PERMISSIONS.length} permissions to admin role`);
      }
    } catch (error: any) {
      this.error(`Failed to sync permissions: ${error.message}`);
      process.exit(1);
    }
  }

  private colorGreen(text: string): string {
    return `\x1b[32m${text}\x1b[0m`;
  }

  private colorYellow(text: string): string {
    return `\x1b[33m${text}\x1b[0m`;
  }
}

export class PermissionsListCommand extends Command {
  protected signature = "permissions:list";
  protected description = "List all available permissions";

  protected options = {
    json: {
      type: "boolean" as const,
      description: "Output as JSON",
      default: false,
    },
    db: {
      type: "boolean" as const,
      description: "List permissions from database instead of config",
      default: false,
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const asJson = args.json as boolean;
    const fromDb = args.db as boolean;

    if (fromDb) {
      await this.listFromDatabase(asJson);
    } else {
      this.listFromConfig(asJson);
    }
  }

  private listFromConfig(asJson: boolean): void {
    if (asJson) {
      this.line(JSON.stringify(PERMISSIONS, null, 2));
      return;
    }

    this.info("Available Permissions (from config):");
    this.line("");
    this.line(`${"SLUG".padEnd(35)} ${"NAME".padEnd(30)} DESCRIPTION`);
    this.line("-".repeat(100));

    for (const p of PERMISSIONS) {
      this.line(`${p.slug.padEnd(35)} ${p.name.padEnd(30)} ${p.description || "-"}`);
    }

    this.line("");
    this.info(`Total: ${PERMISSIONS.length} permission(s)`);
  }

  private async listFromDatabase(asJson: boolean): Promise<void> {
    try {
      await initDatabase();
      const { Permission } = await import("../../Models/User/Permission.js");
      const permissions = await Permission.all();

      if (asJson) {
        this.line(JSON.stringify(permissions, null, 2));
        return;
      }

      this.info("Permissions (from database):");
      this.line("");
      this.line(`${"ID".padEnd(6)} ${"SLUG".padEnd(35)} ${"NAME".padEnd(30)} DESCRIPTION`);
      this.line("-".repeat(110));

      for (const p of permissions as any[]) {
        this.line(
          `${String(p.id).padEnd(6)} ${(p.slug || "").padEnd(35)} ${(p.name || "").padEnd(30)} ${p.description || "-"}`,
        );
      }

      this.line("");
      this.info(`Total: ${(permissions as any[]).length} permission(s)`);
    } catch (error: any) {
      this.error(`Failed to list permissions: ${error.message}`);
    }
  }
}
