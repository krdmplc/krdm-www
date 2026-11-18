/* global CMS */

// Hugo's built-in youtube shortcode: {{< youtube id="VIDEO_ID" loading="lazy" title="..." >}}
// Also reads the short positional form {{< youtube VIDEO_ID >}} used in older content.

CMS.registerEditorComponent({
  id: 'youtube',
  label: 'YouTube',
  fields: [
    { name: 'id', label: 'Video ID (the part after watch?v=)', widget: 'string' },
    { name: 'title', label: 'Title (for screen readers)', widget: 'string', required: false },
  ],
  pattern: /^{{< youtube (?:id="([^"]+)"(?: loading="lazy")?(?: title="([^"]*)")?|([\w-]+)) >}}$/,
  fromBlock (match) {
    return {
      id: match[1] || match[3],
      title: match[2] || '',
    }
  },
  toBlock (obj) {
    const title = obj.title ? ` title="${obj.title.replace(/"/g, '')}"` : ''
    return `{{< youtube id="${obj.id}" loading="lazy"${title} >}}`
  },
  toPreview (obj) {
    return `<img src="https://img.youtube.com/vi/${obj.id}/hqdefault.jpg" alt="${obj.title || 'YouTube'}">`
  },
})
