import { handle } from "hono/vercel";
import { createApp } from "../lib/server.js";

const app = createApp();

export default handle(app);
