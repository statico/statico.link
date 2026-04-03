# [statico.link](https://statico.link) / [ianl.link](https://ianl.link) short URLs

**Why?** I wanted an easy way to paste URLs that I use and share a lot.

**How?** This started as a simple NGINX redirect map [like this](https://gist.github.com/statico/14fa84d7e79722031d5e49694191ba1d) because I already run NGINX for other things and wanted the simplest thing possible. Then people wanted an index page, and then the ipdata.co free API stopped working, so I made it a tiny service that would parse the existing config file. Now it reads links from a published Google Sheet — no database needed.

**What else?** The site is marked noindex, nofollow to prevent crawling. Redirects are sent with a `Referrer-Policy: unsafe-url` header for reasons that I think sounded smart at the time but I'm too lazy to look up right now.

<img width="1434" alt="image" src="https://user-images.githubusercontent.com/137158/138023227-b74cb8f4-48c1-4b1b-b3f8-060e7beca9f3.png">

## Google Sheet setup

Links are stored in a Google Sheet published as CSV. Create a sheet with three columns:

| slug | url | private |
| --- | --- | --- |
| `mylink` | `https://example.com` | |
| `secret` | `https://example.com/hidden` | `y` |

- **slug** — the short URL path (e.g. `mylink` → `https://your.links/mylink`)
- **url** — the destination URL
- **private** — set to `y` to hide the link from the index page (it will still redirect)

To publish: **File → Share → Publish to web**, select the sheet, choose **CSV** format, and copy the URL. Set it as the `SHEET_CSV_URL` environment variable.

Keys should be whole words. The server strips all non-word characters from the key so that you can add a link like `foobarbaz` and then paste `https://your.links/foo-bar-baz` into chat to make it more readable. Links refresh from the sheet every 5 minutes.

## Environment variables

Configure the following env vars in Vercel (or a `.env` file for local development):

- `SHEET_CSV_URL` - Published Google Sheet CSV URL (required)
- `PORT` - Port number to listen on, defaults to 8080
- `IPDATA_KEY` - Get an API key from https://dashboard.ipdata.co/api.html
- `BASE_URL` - Base URL like `https://cool.link`
- `TITLE` - Title to appear on the page
- `DESCRIPTION` - Byline to appear on the page
- `GITHUB_URL` - Link to this page

## Develop

Get a recent Node.js and pnpm and run:

```bash
$ pnpm install
$ pnpm run dev
```

Set the `SHEET_CSV_URL` environment variable (or create a `.env` file).

## Deploy

Deploys to [Vercel](https://vercel.com) — just connect the repo and set the environment variables.

## License

MIT
