/* global CMS */

// Artists are Hugo taxonomy terms: content/artists/<folder>/_index.<lang>.md.
// Events and releases list artists by `ref` (via the relation widget), and Hugo
// matches those values to term folders — so an artist's `ref` must equal its
// folder name. Decap reports the slug of these entries as "<folder>/_index",
// hence the stripping below; for a new entry it falls back to the title,
// slugified the same way Decap names the folder (see `slug` in config.yml).

const slugify = text => text
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9_.~-]+/g, '-')
  .replace(/^-+|-+$/g, '')

CMS.registerEventListener({
  name: 'preSave',
  handler: ({ entry }) => {
    const data = entry.get('data')

    if (entry.get('collection') !== 'artists') {
      return data
    }

    const folder = (entry.get('slug') || '').replace(/\/_index$/, '')

    return data.set('ref', folder || slugify(data.get('title') || ''))
  },
})
