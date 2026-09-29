import type { FastifyInstance } from "fastify";
import { db } from "../db/knex";
import { eventRowToDomain } from "../domain/mapRow";
import { selectEvents } from "../domain/selection";
import { groupBySession } from "../domain/sessionGrouping";
import type { AgeGroup } from "../domain/types";

const VALID_AGE_GROUPS: AgeGroup[] = ["14-15", "16-17", "18-22"];

export function registerEventRoutes(app: FastifyInstance) {
  app.get("/events", async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;

    const balance = Number(q.balance ?? 0);
    const cinemaLimit = Number(q.cinemaLimit ?? 0);
    const ageGroup = q.ageGroup as AgeGroup | undefined;

    if (!ageGroup || !VALID_AGE_GROUPS.includes(ageGroup)) {
      return reply.status(400).send({ error: "ageGroup must be one of " + VALID_AGE_GROUPS.join(", ") });
    }
    if (!Number.isFinite(balance) || !Number.isFinite(cinemaLimit)) {
      return reply.status(400).send({ error: "balance and cinemaLimit must be numbers" });
    }

    const afterHour = q.afterHour !== undefined ? Number(q.afterHour) : undefined;
    const beforeHour = q.beforeHour !== undefined ? Number(q.beforeHour) : undefined;
    if (afterHour !== undefined && (!Number.isFinite(afterHour) || afterHour < 0 || afterHour > 23)) {
      return reply.status(400).send({ error: "afterHour must be a number between 0 and 23" });
    }
    if (beforeHour !== undefined && (!Number.isFinite(beforeHour) || beforeHour < 0 || beforeHour > 24)) {
      return reply.status(400).send({ error: "beforeHour must be a number between 0 and 24" });
    }

    const categories = q.categories ? q.categories.split(",").filter(Boolean) : undefined;
    const ratings = q.ratings
      ? q.ratings
          .split(",")
          .filter(Boolean)
          .map(Number)
      : undefined;
    if (ratings && ratings.some((r) => !Number.isFinite(r) || r < 0)) {
      return reply.status(400).send({ error: "ratings must be a comma-separated list of non-negative numbers" });
    }

    const rows = await db("events").select("*");
    const events = rows.map(eventRowToDomain);

    const result = selectEvents(events, {
      balance,
      cinemaLimit,
      ageGroup,
      afterHour,
      beforeHour,
      categories,
      ratings,
      fromDate: q.fromDate,
      toDate: q.toDate,
    });

    const venueIds = [...new Set(result.events.map((e) => e.venueId))];
    const venues = await db("venues").whereIn("id", venueIds);
    const venueById = new Map(venues.map((v) => [v.id, v]));

    const eventsWithVenue = result.events.map((e) => {
      const venue = venueById.get(e.venueId);
      return {
        ...e,
        venue: venue
          ? { name: venue.name, address: venue.address, lat: Number(venue.lat), lon: Number(venue.lon) }
          : null,
      };
    });

    // The same real event (same title+venue) often comes back as several
    // rows — one per showtime — so collapse those into one card with a
    // `sessions` list instead of showing duplicate cards (e.g. a film
    // screened at 13:00/16:00/19:30 at the same cinema).
    const grouped = groupBySession(eventsWithVenue);

    return reply.send({ events: grouped, fallback: result.fallback });
  });

  // Other known upcoming sessions of the same real-world event (same venue +
  // normalized title), regardless of any user's price/age filters — used by
  // "Предложить другое время" so the recipient can pick a real alternative
  // showtime instead of typing a date freehand.
  app.get("/events/:eventId/sessions", async (req, reply) => {
    const { eventId } = req.params as { eventId: string };
    const event = await db("events").where({ id: eventId }).first();
    if (!event) return reply.status(404).send({ error: "event not found" });

    const siblings = await db("events")
      .where({ venue_id: event.venue_id, normalized_title: event.normalized_title })
      .andWhere("starts_at", ">=", new Date().toISOString())
      .orderBy("starts_at", "asc");

    return reply.send(siblings.map((row) => ({ id: row.id, startsAt: new Date(row.starts_at).toISOString(), price: row.price })));
  });
}
