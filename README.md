# [statico.link](https://statico.link) / [ianl.link](https://ianl.link) short URLs

[![build status](https://img.shields.io/github/actions/workflow/status/statico/statico.link/build.yml?branch=main&style=flat-square)](https://ghcr.io/statico/statico.link)

**Why?** I wanted an easy way to paste URLs that I use and share a lot.

**How?** This started as a simple NGINX redirect map [like this](https://gist.github.com/statico/14fa84d7e79722031d5e49694191ba1d) because I already run NGINX for other things and wanted the simplest thing possible. Then people wanted an index page, and then the ipdata.co free API stopped working, so I made it a tiny service that would parse the existing config file. Now it uses PostgreSQL for better scalability and management.

**What else?** The site is marked noindex, nofollow to prevent crawling. Redirects are sent with a `Referrer-Policy: unsafe-url` header for reasons that I think sounded smart at the time but I'm too lazy to look up right now.

<img width="1434" alt="image" src="https://user-images.githubusercontent.com/137158/138023227-b74cb8f4-48c1-4b1b-b3f8-060e7beca9f3.png">

## Database setup

The application uses PostgreSQL to store links. Create the database schema using the provided `schema.sql` file:

```bash
psql $DATABASE_URL -f schema.sql
```

The schema includes a `links` table with the following structure:
- `slug` (TEXT PRIMARY KEY) - The short URL slug
- `url` (TEXT NOT NULL) - The destination URL
- `private` (BOOLEAN DEFAULT FALSE) - If true, the link won't appear on the index page but will still work for redirects

Keys should be whole words. The server strips all non-word characters from the key so that you can add a link like `foobarbaz` and then paste `https://your.links/foo-bar-baz` into chat to make it more readable.

## Environment variables

Configure the following env vars either through Docker or a `.env` file (Node.js will automatically load `.env` files):

- `DATABASE_URL` - PostgreSQL connection string (required)
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

Make sure you have a PostgreSQL database running and set the `DATABASE_URL` environment variable (or create a `.env` file).

## Deploy

```
$ docker build . --tag ghcr.io/statico/statico.link
```

Etc.

## License

MIT
