import { RolePermissionSeeder } from './RolePermissionSeeder';
import { UserSeeder } from './UserSeeder';

export class DatabaseSeeder {
  async run(): Promise<void> {
    console.log('Running DatabaseSeeder...');

    const { adminRole, userRole } = await new RolePermissionSeeder().run();
    await new UserSeeder().run(
      adminRole.id,
      userRole.id,
    );

    console.log('DatabaseSeeder complete');
  }
}

// Allow running directly: node -r @swc-node/register -r tsconfig-paths/register src/database/seeders/DatabaseSeeder.ts
if (require.main === module) {
  new DatabaseSeeder().run().catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });
}
