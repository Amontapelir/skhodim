import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("users", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.string("max_user_id").notNullable().unique();
    t.string("display_name");
    t.string("age_group");
    t.integer("balance").notNullable().defaultTo(0);
    t.integer("cinema_limit").notNullable().defaultTo(0);
    t.boolean("onboarding_complete").notNullable().defaultTo(false);
    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("venues", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.string("name").notNullable();
    t.string("address").notNullable();
    t.decimal("lat", 9, 6).notNullable();
    t.decimal("lon", 9, 6).notNullable();
  });

  await knex.schema.createTable("events", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.string("external_id").notNullable();
    t.string("source").notNullable();
    t.string("title").notNullable();
    t.string("normalized_title").notNullable();
    t.uuid("venue_id").references("id").inTable("venues").notNullable();
    t.string("category").notNullable();
    t.integer("min_age").notNullable().defaultTo(0);
    t.integer("price").notNullable();
    t.timestamp("starts_at").notNullable();
    t.string("purchase_url").notNullable();
    t.unique(["source", "external_id"]);
  });

  await knex.schema.createTable("invites", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("event_id").references("id").inTable("events").notNullable();
    t.uuid("from_user_id").references("id").inTable("users").notNullable();
    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("invite_responses", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("invite_id").references("id").inTable("invites").notNullable();
    t.uuid("user_id").references("id").inTable("users").notNullable();
    t.string("status").notNullable().defaultTo("pending");
    t.timestamp("proposed_date");
    t.timestamp("responded_at");
    t.unique(["invite_id", "user_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("invite_responses");
  await knex.schema.dropTableIfExists("invites");
  await knex.schema.dropTableIfExists("events");
  await knex.schema.dropTableIfExists("venues");
  await knex.schema.dropTableIfExists("users");
}
