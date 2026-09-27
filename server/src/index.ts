import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config";
import { registerEventRoutes } from "./routes/events";
import { registerProfileRoutes } from "./routes/profile";
import { registerInviteRoutes } from "./routes/invites";

const app = Fastify({ logger: true });

app.register(cors, { origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(",") });

registerEventRoutes(app);
registerProfileRoutes(app);
registerInviteRoutes(app);

app.listen({ port: config.port, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Skhodim server listening on ${address}`);
});
