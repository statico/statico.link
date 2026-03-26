import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { serve } from "@hono/node-server";
import pg from "pg";

const { Pool } = pg;

const PORT = Number(process.env.PORT) || 8080;
const IPDATA_KEY = String(process.env.IPDATA_KEY || "");
const DATABASE_URL = process.env.DATABASE_URL;
const BASE_URL = process.env.BASE_URL || "https://cool.link";
const TITLE = process.env.TITLE || "My Awesome Links";
const DESCRIPTION =
  process.env.DESCRIPTION || "A collection of links that I like";
const GITHUB_URL =
  process.env.GITHUB_URL || "https://github.com/statico/statico-link-list";

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const CUSTOM_LINKS = {
  ip: "Your public IPv4 address",
  geoip: "Information about your IP using ipdata.co",
  useragent: "Your current user agent",
};

// Simple in-memory rate limiter (sliding window, 100 req/min per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW = 60 * 1000;

function rateLimit(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitMap.set(ip, entry);
  }
  entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.timestamps.push(now);
  return true;
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
    if (entry.timestamps.length === 0) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000).unref();

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

function getClientIp(c) {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.env?.incoming?.socket?.remoteAddress ||
    "unknown"
  );
}

export function createApp() {
  const app = new Hono();

  // Security headers (replaces @fastify/helmet)
  app.use(
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
      referrerPolicy: "unsafe-url",
    })
  );

  // Rate limiting middleware
  app.use(async (c, next) => {
    const ip = getClientIp(c);
    if (!rateLimit(ip)) {
      return c.text("Rate limit exceeded", 429);
    }
    await next();
  });

  // Error handler
  app.onError((error, c) => {
    console.error("Request error:", error);
    return c.json(
      { error: error.message || "Internal server error" },
      error.status || 500
    );
  });

  // Route: /ip
  app.get("/ip", (c) => {
    return c.text(getClientIp(c) + "\n");
  });

  // Route: /geoip
  app.get("/geoip", async (c) => {
    if (!IPDATA_KEY) {
      return c.text("IPDATA_KEY not configured", 503);
    }

    try {
      const ip = getClientIp(c);
      const response = await fetch(
        `https://api.ipdata.co/${ip}?api-key=${IPDATA_KEY}`
      );

      if (!response.ok) {
        return c.json({ error: "Failed to fetch IP data" }, response.status);
      }

      const data = await response.json();
      return c.json(data);
    } catch (error) {
      console.error("Error fetching geoip data:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  // Route: /useragent
  app.get("/useragent", (c) => {
    return c.text((c.req.header("user-agent") || "unknown") + "\n");
  });

  // Route: /robots.txt
  app.get("/robots.txt", (c) => {
    return c.text("User-agent: *\nDisallow: /\n");
  });

  // Route: / (index page)
  app.get("/", async (c) => {
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
      const result = await pool.query(
        "SELECT slug, url FROM links WHERE private = FALSE ORDER BY slug"
      );
      for (const row of result.rows) {
        const slug = row.slug;
        const url = row.url;
        if (CUSTOM_LINKS[slug]) continue;
        const short = `${BASE_URL}/${slug}`;
        out += `
      <tr>
        <td class="text-nowrap">
          <a
            href="/${escapeHtml(slug)}"
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
      console.error("Error querying database for index page:", error);
    }

    out += `
    </table>
    </div>
    </div>

    ${process.env.FOOTER_HTML || ""}

    </body>
    </html>
  `;
    return c.html(out);
  });

  // Route: /:key (redirect handler) — must be last
  app.get("/:key", async (c) => {
    try {
      const key = c.req.param("key").replace(/\W/g, "").toLowerCase();

      const result = await pool.query(
        "SELECT url FROM links WHERE slug = $1",
        [key]
      );

      if (result.rows.length === 0) {
        return c.text("Not found", 404);
      }

      c.header("Referrer-Policy", "unsafe-url");
      c.header("X-Robots-Tag", "noindex, nofollow");
      return c.redirect(result.rows[0].url, 302);
    } catch (error) {
      console.error("Error querying database:", error);
      return c.text("Internal server error", 500);
    }
  });

  return app;
}

// Start server (only when running standalone, not in serverless mode)
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("lib/server.js") ||
  process.argv[1]?.endsWith("server.js");

if (isMainModule && !process.env.VERCEL) {
  try {
    await pool.query("SELECT 1");
    console.log("Database connection established");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }

  const app = createApp();

  serve({ fetch: app.fetch, port: PORT, hostname: "0.0.0.0" }, (info) => {
    console.log(`Server listening on http://0.0.0.0:${info.port}`);
  });

  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully");
    await pool.end();
    process.exit(0);
  });
}
