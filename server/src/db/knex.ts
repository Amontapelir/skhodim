import Knex from "knex";
import { config } from "../config";

export const db = Knex({
  client: "pg",
  connection: config.databaseUrl,
});
