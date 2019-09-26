#!/usr/bin/env node

const http = require('http')
const fs = require('fs')

const PORT = Number(process.env.PORT) || 5000
const LINKS_CONF = process.env.LINKS_CONF || 'Missing LINKS_CONF'
const BASE_URL = process.env.BASE_URL || 'https://statico.link'
const TITLE = process.env.TITLE || 'statico.link'

const customLinks = {
  ip: 'Your public IPv4 address',
  geoip: 'Information about your IP using ipdata.co',
  useragent: 'Your current user agent',
}

const server = http.createServer((req, res) => {
  let out = ''
  try {

    out += `<!doctype html>
      <html>
      <head>
        <title>${TITLE}</title>
        <meta charset="utf-8" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous" />
      </head>
      <body>

      <div class="container">
        <h1 class="display-4 my-4">
          ${TITLE}
          <span class="h6 font-weight-normal float-right">
            <a href="${BASE_URL}/how">What is this?</a>
          </span>
        </h1>
        <table class="table table-bordered">
    `

    for (const key in customLinks) {
      const short = `${BASE_URL}/${key}`
      out += `
        <tr>
          <td class="text-nowrap">
            <a href="${short}" rel="noreferrer,noopener" target="_blank">${short}</a>
          </td>
          <td>
            ${customLinks[key]}
          </td>
        </tr>
      `
    }

    const conf = fs.readFileSync(LINKS_CONF, 'utf8')
    const lines = conf.split(/\n+/g).filter(x => x)
    for (const line of lines) {
      const [path, url, ...more] = line.split(/\s+/)
      const short = `${BASE_URL}${path}`
      if (/priv/.test(more.join(' '))) continue
      if (customLinks[path.substr(1)]) continue
      out += `
        <tr>
          <td class="text-nowrap">
            <a
              href="${short}"
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
      `
    }

    out += `
      </table>
      </div>
      </body>
      </html>
    `
  } catch(err) {
    res.writeHead(500)
    res.write(String(err))
    res.end()
    return
  }
  res.writeHead(200, {
    'content-type': 'text/html',
    'referrer-policy': 'no-referrer'
  })
  res.write(out)
  res.end()
})

server.listen(PORT, err => {
  if (err) {
    console.error(`Could not start server: ${err}`)
  } else {
    console.info(`Listening on http://127.0.0.1:${PORT}`)
  }
})
