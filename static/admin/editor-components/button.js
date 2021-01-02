/* global CMS */

CMS.registerEditorComponent({
  id: 'button',
  label: 'Button',
  fields: [
    { name: 'inner', label: 'Text', widget: 'string' },
    { name: 'href', label: 'Link', widget: 'string' },
    { name: 'extraClass', label: 'Class', widget: 'string' },
  ],
  pattern: /^{{< button href="(.*)" extraClass="(.*)" >}}(.*){{< \/button >}}/,
  fromBlock (match) {
    return {
      href: match[1],
      extraClass: match[2],
      inner: match[3],
    }
  },
  toBlock (obj) {
    return `{{< button href="${obj.href}" extraClass="${obj.extraClass}" >}}${obj.inner}{{< /button >}}`
  },
})
