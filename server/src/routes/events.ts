import type { FastifyInstance } from "fastify";
import { db } from "../db/knex";
import { eventRowToDomain } from "../domain/mapRow";
import { selectEvents } from "../domain/selection";
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
    const districts = q.districts ? q.districts.split(",").filter(Boolean) : undefined;

    const rows = await db("events").select("*");
    const venues = await db("venues").select("*");
    const venueById = new Map(venues.map((v) => [v.id, v]));
    const events = rows.map((row) => ({ ...eventRowToDomain(row), district: venueById.get(row.venue_id)?.district ?? null }));

    const result = selectEvents(events, {
      balance,
      cinemaLimit,
      ageGroup,
      afterHour,
      beforeHour,
      categories,
      ratings,
      districts,
      fromDate: q.fromDate,
      toDate: q.toDate,
    });

    const eventsWithVenue = result.events.map((e) => {
      const venue = venueById.get(e.venueId);
      return {
        ...e,
        venue: venue
          ? { name: venue.name, address: venue.address, lat: Number(venue.lat), lon: Number(venue.lon), district: venue.district ?? null }
          : null,
      };
    });

    return reply.send({ events: eventsWithVenue, fallback: result.fallback });
  });
}
