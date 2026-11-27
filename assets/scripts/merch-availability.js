// Live stock state of the merch. Pages are built with what was in stock at the
// last build (content/merch/_content.gotmpl); stock changes at gigs and with
// orders in between, so item pages, merch cards and the cart ask KRDM band
// (GET /api/public/availability on the [data-band-api] address) once per page
// and update what they show. The answer says only available or not, per size,
// never counts. If the app can't be reached, the built state stays, and an
// order is still checked by the app when it's sent.
// Names are prefixed: the scripts share one bundle.

let merchAvailabilityRequest = null

// { [productId]: { available, sizes: { [size]: bool } } }, or null.
function merchAvailability () {
  if (!merchAvailabilityRequest) {
    const holder = document.querySelector('[data-band-api]')
    merchAvailabilityRequest = holder
      ? window.fetch(`${holder.dataset.bandApi}/api/public/availability`)
          .then(response => (response.ok ? response.json() : null))
          .catch(() => null)
      : Promise.resolve(null)
  }
  return merchAvailabilityRequest
}

// An item the app no longer lists (unpublished or archived) is sold out.
function merchState (availability, id) {
  return availability[id] || { available: false, sizes: {} }
}

function merchItemPage (availability) {
  const root = document.querySelector('article[data-merch-item]')
  if (!root) {
    return
  }

  const state = merchState(availability, root.dataset.merchItem)
  const soldOut = !state.available
  const form = root.querySelector('form[data-cart-add]')

  root.querySelector('[data-merch-stamp]').hidden = !soldOut
  const price = root.querySelector('[data-merch-price]')
  if (price) {
    price.hidden = soldOut
  }

  // Sizes in the details: struck through when sold out (as Hugo writes them).
  root.querySelectorAll('[data-merch-size]').forEach((span) => {
    const size = span.dataset.merchSize
    if (state.sizes[size] === false) {
      const s = document.createElement('s')
      const note = document.createElement('span')
      note.className = 'visually-hidden'
      note.textContent = ` (${root.dataset.soldOutText})`
      s.append(size, note)
      span.replaceChildren(s)
    }
    else {
      span.replaceChildren(size)
    }
  })

  if (form) {
    form.querySelectorAll('input[name="size"]').forEach((input) => {
      input.disabled = state.sizes[input.value] === false
      if (input.disabled) {
        input.checked = false
      }
    })
    if (soldOut) {
      form.dataset.soldOut = ''
      form.hidden = true
    }
    else {
      delete form.dataset.soldOut
      form.hidden = false
    }
  }
}

function merchCards (availability) {
  document.querySelectorAll('a.card[data-merch-item]').forEach((card) => {
    const soldOut = !merchState(availability, card.dataset.merchItem).available
    card.querySelector('[data-merch-stamp]').hidden = !soldOut
    const text = card.querySelector('[data-merch-state]')
    text.textContent = soldOut ? text.dataset.soldOut : text.dataset.price
    // list-sort.js keeps sold-out items last.
    const item = card.closest('li')
    if (item && item.parentElement.hasAttribute('data-sort-list')) {
      item.toggleAttribute('data-sort-last', soldOut)
    }
  })
}

function merchAvailabilityInit () {
  if (!document.querySelector('[data-merch-item]')) {
    return
  }
  merchAvailability().then((availability) => {
    if (availability) {
      merchItemPage(availability)
      merchCards(availability)
    }
  })
}

merchAvailabilityInit()
