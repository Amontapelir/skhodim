import { db } from "../src/db/knex";

// dev-user-1/dev-user-2 stay the "main" pair referenced by README, the docker
// compose curl walkthrough and DATA-API.yaml — don't rename or remove them.
// The rest exist purely to give the recipient picker/contacts list more than
// two names to choose from during a demo.
const DEV_USERS = [
  { maxUserId: "dev-user-1", displayName: "Аня", ageGroup: "16-17", balance: 3500, cinemaLimit: 1200 },
  { maxUserId: "dev-user-2", displayName: "Максим", ageGroup: "18-22", balance: 4500, cinemaLimit: 2000 },
  { maxUserId: "dev-user-3", displayName: "Дарья", ageGroup: "16-17", balance: 2800, cinemaLimit: 900 },
  { maxUserId: "dev-user-4", displayName: "Игорь", ageGroup: "18-22", balance: 5200, cinemaLimit: 2000 },
  { maxUserId: "dev-user-5", displayName: "Ксения", ageGroup: "14-15", balance: 1500, cinemaLimit: 600 },
  { maxUserId: "dev-user-6", displayName: "Тимур", ageGroup: "18-22", balance: 3900, cinemaLimit: 1800 },
  { maxUserId: "dev-user-7", displayName: "Полина", ageGroup: "16-17", balance: 3000, cinemaLimit: 1000 },
  { maxUserId: "dev-user-8", displayName: "Егор", ageGroup: "14-15", balance: 2000, cinemaLimit: 800 },
];

async function main() {
  for (const u of DEV_USERS) {
    await db("users")
      .insert({
        max_user_id: u.maxUserId,
        display_name: u.displayName,
        age_group: u.ageGroup,
        balance: u.balance,
        cinema_limit: u.cinemaLimit,
        onboarding_complete: true,
      })
      .onConflict("max_user_id")
      .ignore();
  }

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

    console.log(`Seeded ${DEV_USERS.length} dev users and a sample invite for event "${event.title}" (${event.id}).`);
  }

  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
