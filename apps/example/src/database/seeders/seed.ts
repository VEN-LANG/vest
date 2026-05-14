import bcrypt from "bcrypt";
import { initDatabase } from "@config/db.config.js";
import { EUserType } from "@app/Enums";
import { User } from "@app/Models/User/User.js";
import { Role } from "@app/Models/User/Role.js";
import { Permission } from "@app/Models/User/Permission.js";

/*
|--------------------------------------------------------------------------
| Database Seeder
|--------------------------------------------------------------------------
|
| This seeder creates the initial data needed for the application:
| - Admin and User roles
| - Core permissions for users, roles, permissions, and files
| - Default admin and user accounts
|
*/

export async function seed() {
  await initDatabase();
  const now = new Date();

  // Create roles
  let adminRole = await Role.where("slug", "admin").first();
  if (!adminRole) {
    adminRole = await Role.create({
      name: "Admin",
      slug: "admin",
      description: "Administrator with full access",
      created_at: now,
      updated_at: now,
    });
  }

  let userRole = await Role.where("slug", "user").first();
  if (!userRole) {
    userRole = await Role.create({
      name: "User",
      slug: "user",
      description: "Regular user with limited access",
      created_at: now,
      updated_at: now,
    });
  }

  // Core permissions
  const PERMISSIONS: Array<{ slug: string; name: string; description?: string }> = [
    // Users
    { slug: "view_users", name: "View Users", description: "Can list and view user records" },
    { slug: "create_users", name: "Create Users", description: "Can create new users" },
    { slug: "update_users", name: "Update Users", description: "Can update existing users" },
    { slug: "delete_users", name: "Delete Users", description: "Can delete users" },
    {
      slug: "add_roles_to_users",
      name: "Add Roles to Users",
      description: "Can assign roles to users",
    },
    {
      slug: "remove_roles_from_users",
      name: "Remove Roles from Users",
      description: "Can remove roles from users",
    },
    {
      slug: "activate_and_deactivate_users",
      name: "Activate/Deactivate Users",
      description: "Can toggle user status",
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
    {
      slug: "update_permissions",
      name: "Update Permissions",
      description: "Can update permissions",
    },
    {
      slug: "delete_permissions",
      name: "Delete Permissions",
      description: "Can delete permissions",
    },

    // Files
    { slug: "view_files", name: "View Files", description: "Can list and view files" },
    { slug: "upload_files", name: "Upload Files", description: "Can upload new files" },
    { slug: "delete_files", name: "Delete Files", description: "Can delete files" },
  ];

  // Create or update permissions
  const permIds: number[] = [];
  for (const p of PERMISSIONS) {
    let existing = await Permission.where("slug", p.slug).first();
    if (existing) {
      await existing.update({ name: p.name, description: p.description || "", updated_at: now });
      permIds.push(existing.id as number);
    } else {
      const created = await Permission.create({
        name: p.name,
        slug: p.slug,
        description: p.description || "",
        created_at: now,
        updated_at: now,
      });
      permIds.push(created.id as number);
    }
  }

  // Create admin user
  let admin = await User.where("email", "admin@example.com").first();
  if (!admin) {
    admin = await User.create({
      name: "Admin",
      email: "admin@example.com",
      password: await bcrypt.hash("password", 10),
      active_status: 1,
      created_at: now,
      updated_at: now,
    });
    await admin.profile().create({
      user_id: admin.id as number,
      gender: "male",
      type: EUserType.ADMIN,
      created_at: now,
      updated_at: now,
    });
  }

  // Create regular user
  let regularUser = await User.where("email", "user@example.com").first();
  if (!regularUser) {
    regularUser = await User.create({
      name: "User",
      email: "user@example.com",
      password: await bcrypt.hash("password", 10),
      active_status: 1,
      created_at: now,
      updated_at: now,
    });
    await regularUser.profile().create({
      user_id: regularUser.id as number,
      gender: "male",
      type: EUserType.USER,
      created_at: now,
      updated_at: now,
    });
  }

  // Attach admin role to admin user
  try {
    await (admin as any).roles().sync([adminRole.id as number]);
  } catch (e) {
    await (admin as any).roles().attach(adminRole.id as number);
  }

  // Attach user role to regular user
  try {
    await (regularUser as any).roles().sync([userRole.id as number]);
  } catch (e) {
    await (regularUser as any).roles().attach(userRole.id as number);
  }

  // Attach all permissions to admin role
  try {
    await (adminRole as any).permissions().sync(permIds);
  } catch (e) {
    await (adminRole as any).permissions().attach(permIds);
  }

  console.log("✓ Seeding complete");
  console.log("  - Roles: admin, user");
  console.log("  - Permissions:", PERMISSIONS.length);
  console.log("  - Users: admin@example.com (password), user@example.com (password)");
}

// When run directly, execute the seeder
seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

export default seed;
