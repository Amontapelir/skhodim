import { db } from "./knex";

async function main() {
  await db.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  const [, log] = await db.migrate.latest({
    directory: __dirname + "/migrations",
    loadExtensions: [".ts"],
  });
  console.log("Migrations applied:", log);
  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
