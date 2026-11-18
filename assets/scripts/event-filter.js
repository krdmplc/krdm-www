// Filters the events page by series (Distoržn, Plc Fest, …). Rows carry
// data-series; year groups are hidden when none of their rows match.

function eventFilter () {
  const filter = document.querySelector('[data-event-filter]')

  if (!filter) {
    return
  }

  const buttons = filter.querySelectorAll('button[data-series]')
  const rows = document.querySelectorAll('[data-event-series]')
  const groups = document.querySelectorAll('[data-year-group]')

  filter.hidden = false

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const series = button.dataset.series

      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)))
      rows.forEach((row) => {
        row.classList.toggle('is-hidden', series !== 'all' && row.dataset.eventSeries !== series)
      })
      groups.forEach((group) => {
        group.classList.toggle('is-hidden', !group.querySelector('[data-event-series]:not(.is-hidden)'))
      })
    })
  })
}

eventFilter()
