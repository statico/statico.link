const express = require("express");
const fs = require("fs");
const fetch = require("isomorphic-unfetch");

require("dotenv").config();

const PORT = Number(process.env.PORT) || 8080;
const IPDATA_KEY = String(process.env.IPDATA_KEY);
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

const app = express();
app.set("json spaces", 2);

const ip = (req) => req.headers["x-forwarded-for"] ?? req.socket.remoteAddress;

app.get("/ip", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(ip(req) + "\n");
});

app.get("/geoip", async (req, res) => {
  if (IPDATA_KEY) {
    const data = await fetch(
      `https://api.ipdata.co/${ip(req)}?api-key=${IPDATA_KEY}`
    );
    const obj = await data.json();
    res.json(obj);
  } else {
    res.send("IPDATA_KEY not configured");
  }
});

app.get("/useragent", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(req.headers["user-agent"] + "\n");
});

app.get("/:key", (req, res) => {
  const conf = fs.readFileSync(LINKS_CONF, "utf8");
  const lines = conf.split(/\n+/g).filter((x) => x);
  const key = req.params.key.replace(/\W/g, "").toLowerCase();

  for (const line of lines) {
    const [path, url] = line.split(/\s+/, 2);
    if (path.substr(1) === key) {
      res.set("Referrer-Policy", "unsafe-url");
      res.set("X-Robots-Tag", "noindex, nofollow");
      res.redirect(302, url);
      return;
    }
  }

  res.status(404).send("Not found");
});

app.get("/", (req, res) => {
  let out = `<!doctype html>
    <html>
    <head>
      <title>${TITLE}</title>
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
        <h1 class="display-4">${TITLE}</h1>
        <h2 class="lead">
          ${DESCRIPTION}
          <a href="${GITHUB_URL}" class="text-muted text-decoration-none">(Source)</a>
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
          <a href="/${key}" rel="noreferrer,noopener" target="_blank">${short}</a>
        </td>
        <td class="text-truncate">
          ${CUSTOM_LINKS[key]}
        </td>
      </tr>
    `;
  }

  const conf = fs.readFileSync(LINKS_CONF, "utf8");
  const lines = conf.split(/\n+/g).filter((x) => x);
  for (const line of lines) {
    const [path, url, ...more] = line.split(/\s+/);
    const short = `${BASE_URL}${path}`;
    if (/priv/.test(more.join(" "))) continue;
    if (CUSTOM_LINKS[path.substr(1)]) continue;
    out += `
      <tr>
        <td class="text-nowrap">
          <a
            href="${path}"
            rel="noreferrer,noopener"
            target="_blank"
          >${short}</a>
        </td>
        <td>
          <a
            href="${url}"
            rel="noreferrer,noopener"
            target="_blank"
            class="link-preview"
          >${url}</a>
        </td>
      </tr>
    `;
  }

  out += `
    </table>
    </div>
    </div>

    ${process.env.FOOTER_HTML || ""}

    </body>
    </html>
  `;
  res.send(out);
});

app.listen(PORT, () => {
  console.info(`Listening on http://127.0.0.1:${PORT}`);
});
