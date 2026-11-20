// Stats page (layouts/stats.html): totals, events and releases by year, a
// timeline per artist, and venues, towns, weekdays and kinds of events, for one
// artist or all of them and for a period.
//
// The data is JSON built into the page by layouts/partials/func/stats-data.html
// (only what has already happened, as of the build). Hugo also renders the
// all-time totals and the venue and town rankings for visitors without JS;
// layouts/partials/func/stats-summary.html counts the same way as this file, so
// keep the two in step.
//
// The filters go into the query string (?artist=armaroth&from=2013&to=2019), so a
// view can be linked to, e.g. from an artist page.

// A run of at least this many years with nothing at all is drawn as one gap.
const GAP = 3
// Rows in the venue and town rankings.
const TOP = 10

function el (tag, className, text) {
  const node = document.createElement(tag)
  if (className) {
    node.className = className
  }
  if (text !== undefined) {
    node.textContent = text
  }
  return node
}

function hiddenText (text) {
  return el('span', 'visually-hidden', text)
}

// Count values: [[value, count], …], most first, then A–Z.
function ranked (values, compare) {
  const counts = new Map()
  values.forEach((value) => {
    if (value) {
      counts.set(value, (counts.get(value) || 0) + 1)
    }
  })
  return [...counts].sort((a, b) => b[1] - a[1] || compare(a[0], b[0]))
}

function stats () {
  const root = document.querySelector('[data-stats]')
  if (!root) {
    return
  }

  const data = JSON.parse(root.querySelector('[data-stats-data]').textContent)
  const lang = document.documentElement.lang
  const plural = new Intl.PluralRules(lang)
  const collator = new Intl.Collator(lang)
  const part = name => root.querySelector(`[data-stats-${name}]`)
  const word = (key, n) => {
    const forms = data.labels.plural[key]
    return forms[plural.select(n)] || forms.other
  }

  const years = data.years
  const known = new Set(years)
  const params = new URLSearchParams(window.location.search)
  const yearParam = (name, fallback) => {
    const year = Number(params.get(name))
    return known.has(year) ? year : fallback
  }
  const state = {
    artist: data.artists.some(a => a.ref === params.get('artist')) ? params.get('artist') : 'all',
    from: yearParam('from', years[0]),
    to: yearParam('to', years[years.length - 1]),
  }
  if (state.from > state.to) {
    [state.from, state.to] = [state.to, state.from]
  }

  const artistButtons = [...part('artists').querySelectorAll('button[data-value]')]
  const fromSelect = part('from')
  const toSelect = part('to')

  // The years on the x axis: every year from `from` to `to`, except that a run
  // of GAP or more years with nothing at all (by anyone) becomes one gap. The
  // axis doesn't change with the artist, so a band's quiet years show as such.
  function slots () {
    const out = []
    let year = state.from
    while (year <= state.to) {
      if (known.has(year)) {
        out.push({ year })
        year++
        continue
      }
      let end = year
      while (end < state.to && !known.has(end + 1)) {
        end++
      }
      if (end - year + 1 >= GAP) {
        out.push({ gap: true, from: year, to: end })
      }
      else {
        for (let y = year; y <= end; y++) {
          out.push({ year: y })
        }
      }
      year = end + 1
    }
    return out
  }

  function save () {
    const query = new URLSearchParams(window.location.search)
    const set = (name, value, fallback) => {
      if (value === fallback) {
        query.delete(name)
      }
      else {
        query.set(name, value)
      }
    }
    set('artist', state.artist, 'all')
    set('from', state.from, years[0])
    set('to', state.to, years[years.length - 1])
    const search = query.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`)
  }

  function renderFilters (events, releases) {
    const active = new Set([...events, ...releases].flatMap(item => item.a))
    artistButtons.forEach((button) => {
      const value = button.dataset.value
      button.setAttribute('aria-pressed', String(value === state.artist))
      button.disabled = value !== 'all' && value !== state.artist && !active.has(value)
    })
    fromSelect.value = state.from
    toSelect.value = state.to
  }

  function renderTotals (events, releases) {
    const values = {
      events: events.length,
      releases: releases.length,
      venues: new Set(events.flatMap(e => e.v)).size,
      towns: new Set(events.map(e => e.t).filter(Boolean)).size,
      artists: new Set([...events, ...releases].flatMap(item => item.a)).size,
      years: new Set([...events, ...releases].map(item => item.y)).size,
    }
    part('totals').querySelectorAll('[data-stat]').forEach((tile) => {
      const key = tile.dataset.stat
      const n = values[key]
      tile.querySelector('strong').textContent = n
      tile.querySelector('span').textContent = word(key.replace(/s$/, ''), n)
      // One artist picked: "1 artist" says nothing.
      tile.hidden = key === 'artists' && state.artist !== 'all'
    })
  }

  function renderYears (events, releases, axis) {
    const counts = items => items.reduce((map, item) => map.set(item.y, (map.get(item.y) || 0) + 1), new Map())
    const perEvents = counts(events)
    const perReleases = counts(releases)
    const max = Math.max(1, ...perEvents.values(), ...perReleases.values())
    const short = axis.length > 12

    part('years').replaceChildren(...axis.map((slot) => {
      const item = el('li', 'year-chart__slot')
      if (slot.gap) {
        item.classList.add('year-chart__slot--gap')
        item.title = `${slot.from}–${slot.to}`
        item.append(el('span', 'year-chart__label', '…'), hiddenText(item.title))
        return item
      }
      const e = perEvents.get(slot.year) || 0
      const r = perReleases.get(slot.year) || 0
      const summary = `${slot.year}: ${e} ${word('event', e)}, ${r} ${word('release', r)}`
      const bars = el('span', 'year-chart__bars')
      const bar = (className, n) => {
        const node = el('span', `year-chart__bar ${className}`)
        node.style.setProperty('--value', n / max)
        return node
      }
      bars.setAttribute('aria-hidden', 'true')
      bars.append(bar('year-chart__bar--events', e), bar('year-chart__bar--releases', r))
      item.title = summary
      item.append(
        el('span', 'year-chart__value', e || ''),
        bars,
        el('span', 'year-chart__label', short ? `’${String(slot.year).slice(2)}` : slot.year),
        hiddenText(summary),
      )
      item.querySelectorAll('.year-chart__value, .year-chart__label').forEach(node => node.setAttribute('aria-hidden', 'true'))
      return item
    }))
  }

  // One row per artist with anything in the period, in order of their first
  // event or release; the picked artist stands out, the others are dimmed.
  function renderTimeline (events, releases, axis) {
    const index = new Map()
    axis.forEach((slot, i) => {
      if (!slot.gap) {
        index.set(slot.year, i)
      }
    })
    const x = (date) => {
      const year = Number(date.slice(0, 4))
      const start = Date.UTC(year, 0, 1)
      const share = (Date.parse(date) - start) / (Date.UTC(year + 1, 0, 1) - start)
      return `${((index.get(year) + share) / axis.length) * 100}%`
    }
    const mark = (className, left) => {
      const node = el('span', className)
      node.style.left = left
      return node
    }

    const rows = data.artists.map((artist) => {
      const own = items => items.filter(item => item.a.includes(artist.ref))
      return { artist, events: own(events), releases: own(releases) }
    }).filter(row => row.events.length || row.releases.length)

    rows.forEach((row) => {
      row.dates = [...row.events, ...row.releases].map(item => item.d).sort()
    })
    rows.sort((a, b) => a.dates[0].localeCompare(b.dates[0]) || collator.compare(a.artist.name, b.artist.name))

    const list = el('ol', 'timeline__rows')
    list.setAttribute('role', 'list')
    rows.forEach(({ artist, events, releases, dates }) => {
      const picked = state.artist === artist.ref
      const item = el('li', 'timeline__row')
      if (state.artist !== 'all') {
        item.classList.add(picked ? 'timeline__row--active' : 'timeline__row--dim')
      }

      const first = dates[0].slice(0, 4)
      const last = dates[dates.length - 1].slice(0, 4)
      const name = el('button', 'timeline__name', artist.name)
      name.type = 'button'
      name.setAttribute('aria-pressed', String(picked))
      name.append(hiddenText(`: ${events.length} ${word('event', events.length)}, ${releases.length} ${word('release', releases.length)}, ${first === last ? first : `${first}–${last}`}`))
      name.addEventListener('click', () => {
        state.artist = picked ? 'all' : artist.ref
        render()
      })

      const track = el('div', 'timeline__track')
      track.setAttribute('aria-hidden', 'true')
      axis.forEach((slot, i) => {
        if (slot.gap) {
          const gap = mark('timeline__gap', `${(i / axis.length) * 100}%`)
          gap.style.width = `${100 / axis.length}%`
          track.append(gap)
        }
      })
      const life = mark('timeline__life', x(dates[0]))
      life.style.width = `calc(${x(dates[dates.length - 1])} - ${x(dates[0])})`
      track.append(life)
      events.forEach(e => track.append(mark('timeline__gig', x(e.d))))
      releases.forEach(r => track.append(mark('timeline__release', x(r.d))))

      item.append(name, track)
      list.append(item)
    })

    // Year labels under the tracks: about eight of them, counted back from the
    // last year (so it always has one), plus the gaps.
    const labels = el('div', 'timeline__axis')
    labels.setAttribute('aria-hidden', 'true')
    const step = Math.ceil(axis.length / 8)
    axis.forEach((slot, i) => {
      if (slot.gap || (axis.length - 1 - i) % step === 0) {
        const label = mark('timeline__tick', `${((i + 0.5) / axis.length) * 100}%`)
        label.textContent = slot.gap ? '…' : slot.year
        labels.append(label)
      }
    })

    part('timeline').replaceChildren(list, labels)
  }

  // A ranked list: entries are [label, count] or [label, count, small print].
  function renderBars (name, entries) {
    const max = Math.max(1, ...entries.map(entry => entry[1]))
    part(name).replaceChildren(...entries.map(([label, count, sub]) => {
      const item = el('li', 'bar-list__item')
      item.style.setProperty('--value', count / max)
      const text = el('span', 'bar-list__label', label)
      if (sub) {
        text.append(' ', el('span', 'bar-list__sub', sub))
      }
      item.append(text, el('span', 'bar-list__value', count))
      return item
    }))
  }

  const weekdayNames = Array.from({ length: 7 }, (_, i) => {
    // 1 January 2024 was a Monday.
    const name = new Intl.DateTimeFormat(lang, { weekday: 'long', timeZone: 'UTC' }).format(Date.UTC(2024, 0, 1 + i))
    return name.charAt(0).toUpperCase() + name.slice(1)
  })

  function render () {
    const inPeriod = item => item.y >= state.from && item.y <= state.to
    const byArtist = item => state.artist === 'all' || item.a.includes(state.artist)
    const periodEvents = data.events.filter(inPeriod)
    const periodReleases = data.releases.filter(inPeriod)
    const events = periodEvents.filter(byArtist)
    const releases = periodReleases.filter(byArtist)
    const axis = slots()

    renderFilters(periodEvents, periodReleases)
    renderTotals(events, releases)
    renderYears(events, releases, axis)
    renderTimeline(periodEvents, periodReleases, axis)

    renderBars('venues', ranked(events.flatMap(e => e.v), collator.compare).slice(0, TOP).map(([venue, count]) => {
      const at = venue.lastIndexOf(', ')
      return [venue.slice(0, at), count, venue.slice(at + 2)]
    }))
    renderBars('towns', ranked(events.map(e => e.t), collator.compare).slice(0, TOP))

    const weekdays = Array(7).fill(0)
    events.forEach((e) => {
      // getUTCDay: 0 is Sunday; the list starts on Monday.
      weekdays[(new Date(e.d).getUTCDay() + 6) % 7]++
    })
    renderBars('weekdays', weekdayNames.map((label, i) => [label, weekdays[i]]))
    renderBars('series', ranked(events.map(e => e.s), collator.compare).map(([series, count]) => [data.labels.series[series] || series, count]))

    part('empty').hidden = Boolean(events.length || releases.length)
    save()
  }

  artistButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.artist = button.dataset.value
      render()
    })
  })
  fromSelect.addEventListener('change', () => {
    state.from = Number(fromSelect.value)
    state.to = Math.max(state.from, state.to)
    render()
  })
  toSelect.addEventListener('change', () => {
    state.to = Number(toSelect.value)
    state.from = Math.min(state.from, state.to)
    render()
  })

  part('filters').hidden = false
  root.querySelectorAll('[data-stats-js]').forEach((section) => {
    section.hidden = false
  })
  render()
}

stats()
