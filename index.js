import "dotenv/config";
import fastify from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { readFileSync } from "fs";

const PORT = Number(process.env.PORT) || 8080;
const IPDATA_KEY = String(process.env.IPDATA_KEY || "");
const LINKS_CONF = process.env.LINKS_CONF || "Missing LINKS_CONF";
const BASE_URL = process.env.BASE_URL || "https://cool.link";
const TITLE = process.env.TITLE || "My Awesome Links";
const DESCRIPTION =
  process.env.DESCRIPTION || "A collection of links that I like";
const GITHUB_URL =
  process.env.GITHUB_URL || "https://github.com/statico/statico-link-list";

const CUSTOM_LINKS = {
  ip: "Your public IPv4 address",
  geoip: "Information about your IP using ipdata.co",
  useragent: "Your current user agent",
};

const app = fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

// Register security plugins
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  referrerPolicy: {
    policy: "unsafe-url",
  },
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  skipOnError: true,
});

// Helper function to get client IP
const getClientIp = (request) => {
  return (
    request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    request.ip ||
    request.socket?.remoteAddress ||
    "unknown"
  );
};

// Route: /ip
app.get("/ip", async (request, reply) => {
  reply.type("text/plain");
  return getClientIp(request) + "\n";
});

// Route: /geoip
app.get("/geoip", async (request, reply) => {
  if (!IPDATA_KEY) {
    reply.code(503);
    return "IPDATA_KEY not configured";
  }

  try {
    const ip = getClientIp(request);
    const response = await fetch(
      `https://api.ipdata.co/${ip}?api-key=${IPDATA_KEY}`
    );

    if (!response.ok) {
      reply.code(response.status);
      return { error: "Failed to fetch IP data" };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    app.log.error(error, "Error fetching geoip data");
    reply.code(500);
    return { error: "Internal server error" };
  }
});

// Route: /useragent
app.get("/useragent", async (request, reply) => {
  reply.type("text/plain");
  return (request.headers["user-agent"] || "unknown") + "\n";
});

// Route: /:key (redirect handler)
app.get("/:key", async (request, reply) => {
  try {
    const conf = readFileSync(LINKS_CONF, "utf8");
    const lines = conf.split(/\n+/g).filter((x) => x);
    const key = request.params.key.replace(/\W/g, "").toLowerCase();

    for (const line of lines) {
      const [path, url] = line.split(/\s+/, 2);
      if (path && path.slice(1) === key) {
        reply.header("Referrer-Policy", "unsafe-url");
        reply.header("X-Robots-Tag", "noindex, nofollow");
        return reply.redirect(302, url);
      }
    }

    reply.code(404);
    return "Not found";
  } catch (error) {
    if (error.code === "ENOENT") {
      app.log.error(`Links config file not found: ${LINKS_CONF}`);
      reply.code(500);
      return "Configuration error";
    }
    app.log.error(error, "Error reading links config");
    reply.code(500);
    return "Internal server error";
  }
});

// Route: / (index page)
app.get("/", async (_request, reply) => {
  let out = `<!doctype html>
    <html>
    <head>
      <title>${escapeHtml(TITLE)}</title>
      <meta charset="utf-8" />
      <meta name="robots" content="noindex, nofollow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous" />
      <script>
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.setAttribute('data-bs-theme', 'dark');
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            if (event.matches) {
              document.documentElement.setAttribute('data-bs-theme', 'dark');
            } else {
              document.documentElement.removeAttribute('data-bs-theme');
            }
          });
        }
      </script>

    </head>
    <body>

    <div class="container">
      <div class="my-4">
        <h1 class="display-4">${escapeHtml(TITLE)}</h1>
        <h2 class="lead">
          ${escapeHtml(DESCRIPTION)}
          <a href="${escapeHtml(GITHUB_URL)}" class="text-muted text-decoration-none">(Source)</a>
        </h2>
      </div>
      <div class="table-responsive">
      <table class="table table-bordered">
  `;

  for (const key in CUSTOM_LINKS) {
    const short = `${BASE_URL}/${key}`;
    out += `
      <tr>
        <td class="text-nowrap">
          <a href="/${escapeHtml(key)}" rel="noreferrer,noopener" target="_blank">${escapeHtml(short)}</a>
        </td>
        <td class="text-truncate">
          ${escapeHtml(CUSTOM_LINKS[key])}
        </td>
      </tr>
    `;
  }

  try {
    const conf = readFileSync(LINKS_CONF, "utf8");
    const lines = conf.split(/\n+/g).filter((x) => x);
    for (const line of lines) {
      const [path, url, ...more] = line.split(/\s+/);
      if (!path || !url) continue;
      const short = `${BASE_URL}${path}`;
      if (/priv/.test(more.join(" "))) continue;
      if (CUSTOM_LINKS[path.slice(1)]) continue;
      out += `
      <tr>
        <td class="text-nowrap">
          <a
            href="${escapeHtml(path)}"
            rel="noreferrer,noopener"
            target="_blank"
          >${escapeHtml(short)}</a>
        </td>
        <td>
          <a
            href="${escapeHtml(url)}"
            rel="noreferrer,noopener"
            target="_blank"
            class="link-preview"
          >${escapeHtml(url)}</a>
        </td>
      </tr>
    `;
    }
  } catch (error) {
    app.log.error(error, "Error reading links config for index page");
  }

  out += `
    </table>
    </div>
    </div>

    ${process.env.FOOTER_HTML || ""}

    </body>
    </html>
  `;
  reply.type("text/html");
  return out;
});

// Helper function to escape HTML
function escapeHtml(text) {
  if (typeof text !== "string") return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Error handler
app.setErrorHandler((error, _request, reply) => {
  app.log.error(error, "Request error");
  reply.code(error.statusCode || 500).send({
    error: error.message || "Internal server error",
  });
});

// Start server
try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`Server listening on http://0.0.0.0:${PORT}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
