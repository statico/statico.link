# statico.link / ianl.link short URLs

**Why?** I wanted an easy way to paste URLs that I use and share a lot.

**How?** This started as a simple NGINX redirect map [like this](https://gist.github.com/statico/14fa84d7e79722031d5e49694191ba1d) because I already run NGINX for other things and wanted the simplest thing possible. Then people wanted an index page, and then the ipdata.co free API stopped working, so I made it a tiny service that would parse the existing config file.

**What else?** The site is marked noindex, nofollow to prevent crawling. Redirects are sent with a `Referrer-Policy: unsafe-url` header for reasons that I think sounded smart at the time but I'm too lazy to look up right now.

<img width="1434" alt="image" src="https://user-images.githubusercontent.com/137158/138023227-b74cb8f4-48c1-4b1b-b3f8-060e7beca9f3.png">

## Link configuration file

The link config file is a simple file full of lines in this format, which is compatible with NGINX for the above historical reasons:

```
<key> <url> ;
```

Or, for links you want to work but don't want to list on the page,

```
<key> <url> ; # private
```

## Environment variables

Configure the following env vars either through Docker or a `.env` file or whatever:

- `PORT` - Port number to listen on, defaults to 5000
- `IPDATA_KEY` - Get an API key from https://dashboard.ipdata.co/api.html
- `LINKS_CONF` - Path to the links config file (see above)
- `BASE_URL` - Base URL like `https://cool.link/`
- `TITLE` - Title to appear on the page
- `DESCRIPTION` - Byline to appear on the page
- `GITHUB_URL` - Link to this page

## Develop

Get a recent Node.js and Yarn and run:

```
$ yarn install
$ yarn global add nodemon
$ nodemon
```

## Deploy

```
$ docker build . --tag statico/statico.link
```

Etc.

## License

MIT
