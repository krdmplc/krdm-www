/* global CMS */

CMS.registerEventListener({
  name: 'preSave',
  handler: ({ entry }) => {
    if (entry.get('slug')) {
      return entry.get('data').set('ref', entry.get('slug'))
    } else {
      // you can use any relevant field/logic for generating the initial slug
      let titleSlug = entry.getIn(['data', 'title'], '').toLowerCase().replace(/[']/g, '').replace(/[.]/g, '-').replace(/[\s]/g, '-')
      titleSlug = titleSlug.replace('/_index', '')
      return entry.get('data').set('ref', titleSlug)
    }
  },
})
