// Filters and paginates list pages (events by series and band, releases by
// format, merch by category and band; long event lists a page at a time).
//
// Filters: each is a list of buttons inside [data-filter="<key>"], each with
// data-value ("all" shows everything); items carry data-filter-<key>, with
// several values separated by spaces. A bare [data-filter] uses
// data-filter-value. With more than one filter, an item must match all of them,
// and a button that would leave nothing to show is disabled. Items are looked up
// inside [data-filter-scope] if there is one (so other lists on the page, e.g.
// upcoming events, are left alone). Optional [data-filter-group] wrappers (e.g.
// years) are hidden when none of their items show.
//
// Pagination: a [data-paginate="<page size>"] wrapper shows that many of its
// [data-item] elements (those the filters leave) at a time, with a pager after
// it. Its labels come from data-label-pages / -prev / -next / -page ("%d" is
// the page number). Without JS everything shows.
//
// The chosen filters and page go into the query string (?artist=gmb&page=2), so
// the back button returns to the same view.

const PARAM_PAGE = 'page'

// Page numbers to offer: the first, the last, and the current one with its
// neighbours; null marks a gap.
function pageNumbers (current, total) {
  const wanted = [...new Set([1, current - 1, current, current + 1, total])]
    .filter(n => n >= 1 && n <= total)
    .sort((a, b) => a - b)
  const out = []
  wanted.forEach((n, i) => {
    if (i && n - wanted[i - 1] > 1) {
      out.push(n - wanted[i - 1] === 2 ? n - 1 : null)
    }
    out.push(n)
  })
  return out
}

function createPager (list, onChange) {
  const size = Number(list.dataset.paginate) || 30
  const label = (name, n) => (list.dataset[`label${name}`] || '').replace('%d', n)
  const nav = document.createElement('nav')
  let items = []
  let page = 1

  nav.className = 'pager'
  nav.setAttribute('aria-label', label('Pages'))
  list.after(nav)

  function button (text, target, { current = false, rel = '' } = {}) {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = rel ? `pager__button pager__button--${rel}` : 'pager__button'
    el.textContent = text
    if (current) {
      el.setAttribute('aria-current', 'page')
    }
    else {
      el.addEventListener('click', () => {
        page = target
        render()
        onChange(true)
      })
    }
    if (!rel) {
      el.setAttribute('aria-label', label('Page', target))
    }
    return el
  }

  function render () {
    const total = Math.max(1, Math.ceil(items.length / size))
    page = Math.min(Math.max(page, 1), total)
    const shown = new Set(items.slice((page - 1) * size, page * size))

    list.querySelectorAll('[data-item]').forEach((item) => {
      item.classList.toggle('is-paged-out', !shown.has(item))
    })

    nav.hidden = total < 2
    nav.replaceChildren()
    if (total < 2) {
      return
    }
    if (page > 1) {
      nav.append(button(label('Prev'), page - 1, { rel: 'prev' }))
    }
    pageNumbers(page, total).forEach((n) => {
      if (n === null) {
        const gap = document.createElement('span')
        gap.className = 'pager__gap'
        gap.textContent = '…'
        nav.append(gap)
      }
      else {
        nav.append(button(String(n), n, { current: n === page }))
      }
    })
    if (page < total) {
      nav.append(button(label('Next'), page + 1, { rel: 'next' }))
    }
  }

  return {
    get page () { return page },
    set (newItems, newPage = 1) {
      items = newItems
      page = newPage
      render()
    },
  }
}

function listFilter () {
  const filters = [...document.querySelectorAll('[data-filter]')]
  const lists = [...document.querySelectorAll('[data-paginate]')]

  if (!filters.length && !lists.length) {
    return
  }

  const params = new URLSearchParams(window.location.search)
  const key = filter => filter.dataset.filter || 'value'
  const attr = filter => `data-filter-${key(filter)}`
  const selector = filters.map(filter => `[${attr(filter)}]`).join(',')
  const scope = document.querySelector('[data-filter-scope]') || document
  const items = selector ? [...scope.querySelectorAll(selector)] : []
  const groups = scope.querySelectorAll('[data-filter-group]')
  const active = new Map(filters.map(filter => [filter, 'all']))
  let pagers = []

  function matches (item, filter, value = active.get(filter)) {
    return value === 'all' || (item.getAttribute(attr(filter)) || '').split(' ').includes(value)
  }

  // Whether an item would show if `filter` were set to `value`.
  function shows (item, filter, value) {
    return filters.every(f => f === filter ? matches(item, f, value) : matches(item, f))
  }

  const visible = item => !item.classList.contains('is-hidden') && !item.classList.contains('is-paged-out')

  function save () {
    const query = new URLSearchParams(window.location.search)
    filters.forEach((filter) => {
      const value = active.get(filter)
      if (value === 'all') {
        query.delete(key(filter))
      }
      else {
        query.set(key(filter), value)
      }
    })
    const page = pagers.length ? pagers[0].pager.page : 1
    if (page > 1) {
      query.set(PARAM_PAGE, page)
    }
    else {
      query.delete(PARAM_PAGE)
    }
    const search = query.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`)
  }

  function refreshGroups () {
    groups.forEach((group) => {
      const own = [...group.querySelectorAll(selector || '[data-item]')]
      group.classList.toggle('is-hidden', !own.some(visible))
    })
  }

  // After a page change: tidy up and bring the top of the list into view.
  function onPage (scroll) {
    refreshGroups()
    save()
    if (scroll) {
      const top = scope === document ? lists[0] : scope
      top.scrollIntoView({ block: 'start' })
    }
  }

  function update (page = 1) {
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
    pagers.forEach(({ list, pager }) => {
      pager.set([...list.querySelectorAll('[data-item]')].filter(item => !item.classList.contains('is-hidden')), page)
    })
    onPage(false)
  }

  pagers = lists.map(list => ({ list, pager: createPager(list, onPage) }))

  filters.forEach((filter) => {
    const buttons = [...filter.querySelectorAll('button[data-value]')]
    const press = (button) => {
      active.set(filter, button.dataset.value)
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)))
    }
    const initial = buttons.find(b => b.dataset.value === params.get(key(filter)))

    if (initial) {
      press(initial)
    }
    filter.hidden = false
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        press(button)
        update()
      })
    })
  })

  update(Number(params.get(PARAM_PAGE)) || 1)
}

listFilter()
