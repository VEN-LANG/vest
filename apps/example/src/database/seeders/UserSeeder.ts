import bcrypt from 'bcryptjs';
import User from '../../app/Models/User/User';
import UserProfile from '../../app/Models/User/UserProfile';

type UserWithRoles = User & { roles: () => { sync: (ids: number[]) => Promise<void>; attach: (id: number) => Promise<void> } };

export class UserSeeder {
  async run(adminRoleId: number, userRoleId: number): Promise<void> {
    const now = new Date();
    console.log('  Seeding users...');

    let admin = await User.where('email', 'admin@example.com').first() as UserWithRoles | null;
    if (!admin) {
      admin = await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: await bcrypt.hash('password', 12),
        status: 'active',
        created_at: now,
        updated_at: now,
      }) as UserWithRoles;
      await UserProfile.create({ user_id: admin.getAttribute('id'), gender: 'other', created_at: now, updated_at: now });
    }

    let regularUser = await User.where('email', 'user@example.com').first() as UserWithRoles | null;
    if (!regularUser) {
      regularUser = await User.create({
        name: 'User',
        email: 'user@example.com',
        password: await bcrypt.hash('password', 12),
        status: 'active',
        created_at: now,
        updated_at: now,
      }) as UserWithRoles;
      await UserProfile.create({ user_id: regularUser.getAttribute('id'), gender: 'other', created_at: now, updated_at: now });
    }

    try { await admin.roles().sync([adminRoleId]); } catch { await admin.roles().attach(adminRoleId); }
    try { await regularUser.roles().sync([userRoleId]); } catch { await regularUser.roles().attach(userRoleId); }

    console.log('  ✓ Users seeded:');
    console.log('    admin@example.com    (password: password) — Admin role');
    console.log('    user@example.com     (password: password) — User role');
  }
}
