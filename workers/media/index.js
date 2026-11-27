// Serves KRDM's shared media bucket (R2 `krdm-media`) read-only at
// https://media.krdm.si/<key>. The bucket itself is never public: R2 can't be
// capped at $0, but this Worker runs on Workers Free, which stops at 100 000
// requests a day, so it can never read more than ~3.1M objects a month (R2's
// free tier is 10M). Visitors don't come here: Hugo fetches the originals at
// build time and serves resized copies from the site. What does come here is
// builds, CMS thumbnails and old links to /media/uploads/… (redirected).

// Prefixes that may be read, and how long a copy may be kept. The website's CMS
// (Decap Turbo) uploads under www/, where re-uploading a file name replaces it, so
// copies are kept for an hour. krdm-band (band.krdm.si) never reuses a key under
// its prefixes, so those never change.
const IMMUTABLE = 'public, max-age=31536000, immutable'
const PREFIXES = {
  'www/': 'public, max-age=3600',
  'products/': IMMUTABLE,
  'imported/': IMMUTABLE,
}

const TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  pdf: 'application/pdf',
}

// Sent with every response. The sandboxing CSP keeps an uploaded SVG or HTML
// file from running scripts, should one ever be opened directly.
const BASE_HEADERS = {
  'access-control-allow-origin': '*',
  'cross-origin-resource-policy': 'cross-origin',
  'content-security-policy': 'default-src \'none\'; img-src \'self\'; style-src \'unsafe-inline\'; sandbox',
  'x-content-type-options': 'nosniff',
}

function notFound () {
  return new Response('Not found', {
    status: 404,
    headers: { ...BASE_HEADERS, 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' },
  })
}

async function load (env, key) {
  const object = await env.MEDIA.get(key)
  if (!object) return notFound()
  const headers = new Headers(BASE_HEADERS)
  object.writeHttpMetadata(headers)
  if (!headers.get('content-type') || headers.get('content-type') === 'application/octet-stream') {
    const ext = key.split('.').pop().toLowerCase()
    headers.set('content-type', TYPES[ext] || 'application/octet-stream')
  }
  headers.set('etag', object.httpEtag)
  headers.set('last-modified', object.uploaded.toUTCString())
  headers.set('cache-control', PREFIXES[key.slice(0, key.indexOf('/') + 1)])
  return new Response(object.body, { headers })
}

export default {
  async fetch (request, env, ctx) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { ...BASE_HEADERS, allow: 'GET, HEAD' } })
    }

    const url = new URL(request.url)
    let key
    try {
      key = decodeURIComponent(url.pathname.slice(1))
    }
    catch {
      return notFound()
    }
    const allowed = Object.keys(PREFIXES).some(prefix => key.startsWith(prefix))
    if (!allowed || key.endsWith('/') || key.split('/').includes('..')) return notFound()

    // The query string is left out of the cache key, so it can't be used to skip
    // the cache. (The Cache API works on the custom domain, not on workers.dev,
    // which is turned off.)
    const cacheKey = new Request(url.origin + url.pathname)
    let response = await caches.default.match(cacheKey)
    if (!response) {
      response = await load(env, key)
      ctx.waitUntil(caches.default.put(cacheKey, response.clone()))
    }

    const etag = response.headers.get('etag')
    if (etag && request.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304, headers: response.headers })
    }
    if (request.method === 'HEAD') {
      return new Response(null, { status: response.status, headers: response.headers })
    }
    return response
  },
}
