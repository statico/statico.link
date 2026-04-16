import { createApp } from "../lib/server.js";

const app = createApp();

export default (req, res) => app.fetch(req, res);
