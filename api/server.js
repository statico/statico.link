import { handle } from "@hono/node-server/vercel";
import { createApp } from "../lib/server.js";

const app = createApp();

export default handle(app);
