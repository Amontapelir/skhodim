import type { FastifyInstance } from "fastify";
import { db } from "../db/knex";
import { userRowToDomain } from "../domain/mapRow";

export function registerProfileRoutes(app: FastifyInstance) {
  app.get("/users/:maxUserId", async (req, reply) => {
    const { maxUserId } = req.params as { maxUserId: string };
    const row = await db("users").where({ max_user_id: maxUserId }).first();
    if (!row) return reply.status(404).send({ error: "not found" });
    return reply.send(userRowToDomain(row));
  });

  // "Contacts known to the bot" — every other onboarded user, as a stand-in
  // for MAX's real contact list until the bot is wired to the real MAX API.
  app.get("/users/:maxUserId/contacts", async (req, reply) => {
    const { maxUserId } = req.params as { maxUserId: string };
    const rows = await db("users").whereNot({ max_user_id: maxUserId }).where({ onboarding_complete: true });
    return reply.send(rows.map((r) => ({ maxUserId: r.max_user_id, displayName: r.display_name })));
  });

  app.patch("/users/:maxUserId", async (req, reply) => {
    const { maxUserId } = req.params as { maxUserId: string };
    const body = req.body as Partial<{ balance: number; cinemaLimit: number; ageGroup: string; displayName: string }>;

    const update: Record<string, unknown> = {};
    if (body.balance !== undefined) update.balance = body.balance;
    if (body.cinemaLimit !== undefined) update.cinema_limit = body.cinemaLimit;
    if (body.ageGroup !== undefined) update.age_group = body.ageGroup;
    if (body.displayName !== undefined) update.display_name = body.displayName;

    const [row] = await db("users").where({ max_user_id: maxUserId }).update(update).returning("*");
    if (!row) return reply.status(404).send({ error: "not found" });
    return reply.send(userRowToDomain(row));
  });

  // "Купил" — decrements the shown remaining balance; no payment data involved.
  app.post("/users/:maxUserId/purchases", async (req, reply) => {
    const { maxUserId } = req.params as { maxUserId: string };
    const { eventId } = req.body as { eventId: string };

    const user = await db("users").where({ max_user_id: maxUserId }).first();
    if (!user) return reply.status(404).send({ error: "user not found" });
    const event = await db("events").where({ id: eventId }).first();
    if (!event) return reply.status(404).send({ error: "event not found" });

    const isCinema = event.category === "cinema";
    const field = isCinema ? "cinema_limit" : "balance";
    const current = isCinema ? user.cinema_limit : user.balance;
    if (event.price > current) {
      return reply.status(400).send({ error: "purchase exceeds remaining limit" });
    }

    const [row] = await db("users")
      .where({ max_user_id: maxUserId })
      .update({ [field]: current - event.price })
      .returning("*");
    return reply.send(userRowToDomain(row));
  });
}
