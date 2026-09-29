import type { FastifyInstance } from "fastify";
import { db } from "../db/knex";
import { eventRowToDomain } from "../domain/mapRow";
import type { MessengerAdapter } from "../bot/MessengerAdapter";

const VALID_STATUSES = ["going", "cannot", "propose_other_date"] as const;

export function registerInviteRoutes(app: FastifyInstance, bot: MessengerAdapter) {
  // Create an invite from one user to a set of recipients for an event.
  app.post("/invites", async (req, reply) => {
    const { eventId, fromMaxUserId, toMaxUserIds, comment } = req.body as {
      eventId: string;
      fromMaxUserId: string;
      toMaxUserIds: string[];
      comment?: string;
    };

    const fromUser = await db("users").where({ max_user_id: fromMaxUserId }).first();
    if (!fromUser) return reply.status(404).send({ error: "sender not found" });
    const event = await db("events").where({ id: eventId }).first();
    if (!event) return reply.status(404).send({ error: "event not found" });
    const venue = await db("venues").where({ id: event.venue_id }).first();

    const [invite] = await db("invites")
      .insert({ event_id: eventId, from_user_id: fromUser.id, comment: comment?.trim() || null })
      .returning("*");

    const recipients = await db("users").whereIn("max_user_id", toMaxUserIds);
    for (const recipient of recipients) {
      await db("invite_responses").insert({ invite_id: invite.id, user_id: recipient.id, status: "pending" });

      const eventDomain = eventRowToDomain(event);
      const startsAt = new Date(eventDomain.startsAt).toLocaleString("ru-RU", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });
      // A failed MAX notification must not roll back the invite itself — the
      // recipient still sees it in the "Зовут" section next time they open
      // the mini-app, same fail-safe pattern as fetchWithFallback/createBotAdapter.
      bot
        .sendInviteNotification(recipient.max_user_id, {
          eventTitle: eventDomain.title,
          eventSubtitle: `${venue?.name ?? ""}, ${startsAt}`.trim(),
          fromDisplayName: fromUser.display_name,
          comment: invite.comment,
        })
        .catch((err) => app.log.error({ err, recipient: recipient.max_user_id }, "sendInviteNotification failed"));
    }

    return reply.status(201).send({ id: invite.id });
  });

  // All incoming invites for a user, with affordability and everyone's status.
  app.get("/users/:maxUserId/invites", async (req, reply) => {
    const { maxUserId } = req.params as { maxUserId: string };
    const user = await db("users").where({ max_user_id: maxUserId }).first();
    if (!user) return reply.status(404).send({ error: "not found" });

    const myResponses = await db("invite_responses").where({ user_id: user.id });
    const inviteIds = myResponses.map((r) => r.invite_id);
    if (inviteIds.length === 0) return reply.send([]);

    const invites = await db("invites")
      .whereIn("invites.id", inviteIds)
      .join("users as senders", "senders.id", "invites.from_user_id")
      .select("invites.*", "senders.display_name as from_display_name", "senders.max_user_id as from_max_user_id");
    const eventIds = invites.map((i) => i.event_id);
    const events = await db("events").whereIn("id", eventIds);
    const eventsById = new Map(events.map((e) => [e.id, e]));

    const venueIds = [...new Set(events.map((e) => e.venue_id))];
    const venues = await db("venues").whereIn("id", venueIds);
    const venueById = new Map(venues.map((v) => [v.id, v]));

    const allResponses = await db("invite_responses")
      .whereIn("invite_id", inviteIds)
      .join("users", "users.id", "invite_responses.user_id")
      .select("invite_responses.*", "users.display_name", "users.max_user_id as user_max_id");

    const result = invites.map((invite) => {
      const event = eventsById.get(invite.event_id);
      const eventDomain = eventRowToDomain(event);
      const venue = venueById.get(event.venue_id);
      const eventWithVenue = {
        ...eventDomain,
        venue: venue
          ? { name: venue.name, address: venue.address, lat: Number(venue.lat), lon: Number(venue.lon) }
          : null,
      };
      const isCinema = eventDomain.category === "cinema";
      const budget = isCinema ? user.cinema_limit : user.balance;
      const fitsBalance = eventDomain.price <= budget;
      const shortfall = fitsBalance ? 0 : eventDomain.price - budget;

      const responses = allResponses
        .filter((r) => r.invite_id === invite.id)
        .map((r) => ({
          userMaxId: r.user_max_id,
          displayName: r.display_name,
          status: r.status,
          proposedDate: r.proposed_date,
        }));

      return {
        inviteId: invite.id,
        event: eventWithVenue,
        fitsBalance,
        shortfall,
        comment: invite.comment,
        fromDisplayName: invite.from_display_name ?? invite.from_max_user_id,
        myStatus: responses.find((r) => r.userMaxId === maxUserId)?.status ?? "pending",
        responses,
      };
    });

    return reply.send(result);
  });

  // Respond to an invite: going / cannot / propose_other_date.
  app.post("/invites/:inviteId/respond", async (req, reply) => {
    const { inviteId } = req.params as { inviteId: string };
    const { maxUserId, status, proposedDate } = req.body as {
      maxUserId: string;
      status: (typeof VALID_STATUSES)[number];
      proposedDate?: string;
    };

    if (!VALID_STATUSES.includes(status)) {
      return reply.status(400).send({ error: "status must be one of " + VALID_STATUSES.join(", ") });
    }
    if (status === "propose_other_date" && !proposedDate) {
      return reply.status(400).send({ error: "proposedDate required for propose_other_date" });
    }

    const user = await db("users").where({ max_user_id: maxUserId }).first();
    if (!user) return reply.status(404).send({ error: "user not found" });

    const [row] = await db("invite_responses")
      .where({ invite_id: inviteId, user_id: user.id })
      .update({ status, proposed_date: proposedDate ?? null, responded_at: db.fn.now() })
      .returning("*");

    if (!row) return reply.status(404).send({ error: "invite response not found" });
    return reply.send(row);
  });
}
