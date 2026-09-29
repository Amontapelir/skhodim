import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("invites", (t) => {
    t.text("comment");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("invites", (t) => {
    t.dropColumn("comment");
  });
}
