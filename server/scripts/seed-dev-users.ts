import { db } from "../src/db/knex";

async function main() {
  await db("users")
    .insert({
      max_user_id: "dev-user-1",
      display_name: "Аня",
      age_group: "16-17",
      balance: 3500,
      cinema_limit: 1200,
      onboarding_complete: true,
    })
    .onConflict("max_user_id")
    .ignore();

  await db("users")
    .insert({
      max_user_id: "dev-user-2",
      display_name: "Максим",
      age_group: "18-22",
      balance: 4500,
      cinema_limit: 2000,
      onboarding_complete: true,
    })
    .onConflict("max_user_id")
    .ignore();

  const event = await db("events").orderBy("starts_at").first();
  const sender = await db("users").where({ max_user_id: "dev-user-2" }).first();
  const recipient = await db("users").where({ max_user_id: "dev-user-1" }).first();

  const existingInvite = await db("invites")
    .where({ event_id: event.id, from_user_id: sender.id })
    .first();

  if (existingInvite) {
    console.log("Dev users and sample invite already exist, nothing to do.");
  } else {
    const [invite] = await db("invites")
      .insert({ event_id: event.id, from_user_id: sender.id })
      .returning("*");

    await db("invite_responses").insert([
      { invite_id: invite.id, user_id: recipient.id, status: "pending" },
      { invite_id: invite.id, user_id: sender.id, status: "going" },
    ]);

    console.log(`Seeded dev-user-1, dev-user-2, and an invite for event "${event.title}" (${event.id}).`);
  }

  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
