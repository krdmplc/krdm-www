// Filters a list page (events by series, releases by format, merch by category
// and band). Each filter is a list of buttons inside [data-filter="<key>"], each
// with data-value ("all" shows everything); items carry data-filter-<key>, with
// several values separated by spaces. A bare [data-filter] uses
// data-filter-value. With more than one filter, an item must match all of them,
// and a button that would leave nothing to show is disabled. Optional
// [data-filter-group] wrappers (e.g. years) are hidden when none of their items
// match.

function listFilter () {
  const filters = [...document.querySelectorAll('[data-filter]')]

  if (!filters.length) {
    return
  }

  const attr = filter => `data-filter-${filter.dataset.filter || 'value'}`
  const selector = filters.map(filter => `[${attr(filter)}]`).join(',')
  const items = [...document.querySelectorAll(selector)]
  const groups = document.querySelectorAll('[data-filter-group]')
  const active = new Map(filters.map(filter => [filter, 'all']))

  function matches (item, filter, value = active.get(filter)) {
    return value === 'all' || (item.getAttribute(attr(filter)) || '').split(' ').includes(value)
  }

  // Whether an item would show if `filter` were set to `value`.
  function shows (item, filter, value) {
    return filters.every(f => f === filter ? matches(item, f, value) : matches(item, f))
  }

  function update () {
    items.forEach((item) => {
      item.classList.toggle('is-hidden', !filters.every(filter => matches(item, filter)))
    })
    if (filters.length > 1) {
      filters.forEach((filter) => {
        filter.querySelectorAll('button[data-value]').forEach((button) => {
          button.disabled = !items.some(item => shows(item, filter, button.dataset.value))
        })
      })
    }
    groups.forEach((group) => {
      const visible = [...group.querySelectorAll(selector)].some(item => !item.classList.contains('is-hidden'))
      group.classList.toggle('is-hidden', !visible)
    })
  }

  filters.forEach((filter) => {
    const buttons = filter.querySelectorAll('button[data-value]')

    filter.hidden = false
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        active.set(filter, button.dataset.value)
        buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)))
        update()
      })
    })
  })
}

listFilter()
