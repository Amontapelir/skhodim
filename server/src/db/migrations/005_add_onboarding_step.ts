import type { Knex } from "knex";

// balance/cinema_limit default to 0 (NOT NULL), so a user who genuinely has
// 0 ₽ is indistinguishable from one who hasn't answered yet — need an
// explicit step marker to resume onboarding correctly.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (t) => {
    t.string("onboarding_step").notNullable().defaultTo("balance");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (t) => {
    t.dropColumn("onboarding_step");
  });
}
