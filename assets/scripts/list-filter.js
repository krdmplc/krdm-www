// Filters a list page (events by series, releases by format). The filter is a
// list of buttons inside [data-filter], each with data-value ("all" shows
// everything); items carry data-filter-value. Optional [data-filter-group]
// wrappers (e.g. years) are hidden when none of their items match.

function listFilter () {
  const filter = document.querySelector('[data-filter]')

  if (!filter) {
    return
  }

  const buttons = filter.querySelectorAll('button[data-value]')
  const items = document.querySelectorAll('[data-filter-value]')
  const groups = document.querySelectorAll('[data-filter-group]')

  filter.hidden = false

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.value

      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)))
      items.forEach((item) => {
        item.classList.toggle('is-hidden', value !== 'all' && item.dataset.filterValue !== value)
      })
      groups.forEach((group) => {
        group.classList.toggle('is-hidden', !group.querySelector('[data-filter-value]:not(.is-hidden)'))
      })
    })
  })
}

listFilter()
