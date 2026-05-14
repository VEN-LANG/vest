// DatabaseSeeder - orchestrates all seeders in order (like Laravel)
import seedDefault from "./seed";

export default async function DatabaseSeeder() {
  // run core seeders in order
  console.log("Running DatabaseSeeder...");
  await seedDefault();
  console.log("DatabaseSeeder complete");
}

// allow running directly
if (require.main === module) {
  DatabaseSeeder().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
