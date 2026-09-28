import type { Knex } from "knex";

// Reverts 003_add_venue_district: the district-by-nearest-centroid approach
// was Moscow-only and too coarse to be useful — replaced by a client-side
// radius filter around a point, which works for any city without static data.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("venues", (t) => {
    t.dropColumn("district");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("venues", (t) => {
    t.string("district");
  });
}
