// Sorts the merch list. The buttons inside [data-sort] (data-value: popular,
// title, price or date) reorder the items of [data-sort-list], which carry
// data-sort-title, data-sort-date, data-sort-price, and data-sort-last when
// they are sold out. Sold-out items stay at the end whatever the order. The
// cards come from Hugo in popularity order (func/merch-sorted), so "popular"
// restores the original order. The choice goes into the query string
// (?sort=price) next to the filters of list-filter.js. Without JS the list
// stays in popularity order and the buttons stay hidden.

const PARAM = 'sort'
const DEFAULT = 'popular'

function listSort () {
  const control = document.querySelector('[data-sort]')
  const list = document.querySelector('[data-sort-list]')

  if (!control || !list) {
    return
  }

  const buttons = [...control.querySelectorAll('button[data-value]')]
  const items = [...list.children]
  const original = new Map(items.map((item, i) => [item, i]))
  const collator = new Intl.Collator(document.documentElement.lang || undefined, { sensitivity: 'base', numeric: true })
  const price = item => Number(item.dataset.sortPrice ?? Infinity)

  const compare = {
    popular: () => 0,
    title: (a, b) => collator.compare(a.dataset.sortTitle, b.dataset.sortTitle),
    price: (a, b) => price(a) - price(b),
    date: (a, b) => (b.dataset.sortDate || '').localeCompare(a.dataset.sortDate || ''),
  }

  function apply (order) {
    const sorted = [...items].sort((a, b) =>
      ('sortLast' in a.dataset) - ('sortLast' in b.dataset)
      || compare[order](a, b)
      || original.get(a) - original.get(b))
    list.append(...sorted)
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === order)))
  }

  function save (order) {
    const query = new URLSearchParams(window.location.search)
    if (order === DEFAULT) {
      query.delete(PARAM)
    }
    else {
      query.set(PARAM, order)
    }
    const search = query.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`)
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      apply(button.dataset.value)
      save(button.dataset.value)
    })
  })

  const initial = new URLSearchParams(window.location.search).get(PARAM)
  if (initial && initial in compare) {
    apply(initial)
  }
  control.hidden = false
}

listSort()
