#!/usr/bin/env node

const http = require('http')
const fs = require('fs')

const PORT = Number(process.env.PORT) || 5000
const LINKS_CONF = process.env.LINKS_CONF || 'Missing LINKS_CONF'
const BASE_URL = process.env.BASE_URL || 'https://statico.link'

const customLinks = {
  ip: 'Your public IPv4 address',
  geoip: 'Inforamtion about your IP using ipdata.co',
  useragent: 'Your current user agent',
}

const server = http.createServer((req, res) => {
  let out = ''
  try {

    out += `<!doctype html>
      <html>
      <head>
        <title>${BASE_URL}</title>
        <meta charset="utf-8" />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous" />
      </head>
      <body>

      <div class="d-flex flex-column flex-md-row align-items-center p-3 px-md-4 mb-4 bg-white border-bottom shadow-sm">
        <h3 class="my-0 mr-md-auto font-weight-normal">statico.link</h3>
        <nav class="my-2 my-md-0 mr-md-3">
          <a class="p-2 text-dark" href="${BASE_URL}/how">Why?</a>
        </nav>
      </div>

      <div class="container">
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
            <blockquote class="embedly-card">
              <h4>
                <a href="${url}" rel="noreferrer,noopener" target="_blank">${url}</a>
              </h4>
              <p>${url}</p>
            </blockquote>
          </td>
        </tr>
      `
    }

    out += `
      </table>
      </div>
      <script async src="https://cdn.embedly.com/widgets/platform.js" charset="UTF-8"></script>
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
