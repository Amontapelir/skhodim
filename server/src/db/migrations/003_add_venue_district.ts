import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("venues", (t) => {
    t.string("district");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("venues", (t) => {
    t.dropColumn("district");
  });
}
