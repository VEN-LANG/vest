import bcrypt from "bcrypt";
import { initDatabase } from "@vest-ts/db";
import { User } from "../../../src/app/Models/User.js";
import { Post } from "../../../src/app/Models/Post.js";

export async function seed(): Promise<void> {
  await initDatabase();

  // Create a demo user
  let alice = await User.where("email", "alice@example.com").first();
  if (!alice) {
    alice = await User.create({
      name: "Alice",
      email: "alice@example.com",
      password: await bcrypt.hash("password", 10),
    });
    console.log("  Created user: alice@example.com / password");
  }

  // Create some demo posts
  const count = await Post.where("user_id", alice.id).count();
  if (count === 0) {
    await Post.create({
      title: "Hello Vest!",
      body: "This is my first post.",
      user_id: alice.id,
      published: true,
    });
    await Post.create({
      title: "Building APIs",
      body: "Vest makes it easy to build REST APIs.",
      user_id: alice.id,
      published: true,
    });
    console.log("  Created 2 demo posts");
  }

  console.log("Seeding complete.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
export default seed;
