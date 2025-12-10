import serverless from "serverless-http";
import app from "../index.js";

// Wrap Fastify app with serverless-http for Vercel compatibility
const handler = serverless(app, {
  binary: ["image/*", "application/pdf"],
});

export default handler;
