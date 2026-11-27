/* global sendToBand, merchAvailability */

// Merch cart. There is no payment: the cart lives in this browser
// (localStorage) as [{ id, size, qty }] (id: the app's product id) and is sent
// as an order to KRDM band (sendToBand, band-form.js) from the cart page
// (layouts/shortcodes/cart.html), which also holds the titles, prices and stock
// state as JSON. Item pages add to it ([data-cart-add]), the header shows the
// count ([data-cart-link]), and the order thank-you page ([data-cart-done])
// shows what was sent and empties it.
// Names are prefixed: the scripts share one bundle (theme-toggle.js has its own
// STORAGE_KEY).

const CART_KEY = 'cart'
const CART_LAST_ORDER_KEY = 'lastOrder'
const CART_MAX_QTY = 10

function clampQty (value) {
  return Math.min(CART_MAX_QTY, Math.max(1, Math.round(Number(value)) || 1))
}

function readCart () {
  try {
    const cart = JSON.parse(window.localStorage.getItem(CART_KEY))
    return Array.isArray(cart)
      ? cart.filter(line => line && typeof line.id === 'string' && Number(line.qty) > 0)
      : []
  }
  catch {
    return []
  }
}

function writeCart (cart) {
  try {
    if (cart.length) {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart.map(({ id, size, qty }) => ({ id, size, qty }))))
    }
    else {
      window.localStorage.removeItem(CART_KEY)
    }
  }
  catch {
    // Storage blocked (private mode etc.): the cart lasts only for this page.
  }
  updateCartLink(cart)
}

// Within Slovenia an order goes by post; elsewhere it's an order abroad, whose
// postage we work out by hand.
function cartIsSlovenia (country) {
  return /^\s*(slovenija|slovenia|si|slo)\s*$/i.test(country || '')
}

function formatPrice (amount, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount)
}

// Header link: hidden while the cart is empty, otherwise shows the item count.
function updateCartLink (cart = readCart()) {
  const count = cart.reduce((sum, line) => sum + Number(line.qty), 0)

  document.querySelectorAll('[data-cart-link]').forEach((link) => {
    link.hidden = count === 0
    link.querySelector('[data-cart-count]').textContent = String(count)
  })
}

// Item page: size + quantity form. Adding the same size again adds up.
function cartAdd () {
  document.querySelectorAll('form[data-cart-add]').forEach((form) => {
    const status = form.querySelector('[data-cart-status]')

    // Sold out (as built, or as merch-availability.js found): stays hidden.
    form.hidden = 'soldOut' in form.dataset
    form.addEventListener('submit', (event) => {
      event.preventDefault()

      const data = new FormData(form)
      const id = form.dataset.cartAdd
      const size = data.get('size') || ''
      const qty = clampQty(data.get('qty'))
      const cart = readCart()
      const line = cart.find(l => l.id === id && l.size === size)

      if (line) {
        line.qty = clampQty(Number(line.qty) + qty)
      }
      else {
        cart.push({ id, size, qty })
      }
      writeCart(cart)

      const link = document.createElement('a')
      link.href = form.dataset.cartUrl
      link.textContent = status.dataset.view
      status.replaceChildren(`${status.dataset.added} `, link)
    })
  })
}

// Cart page: lines, total and the order form.
function cartPage () {
  const root = document.querySelector('[data-cart]')

  if (!root) {
    return
  }

  const items = JSON.parse(root.querySelector('[data-cart-data]').textContent)
  const locale = document.documentElement.lang || 'sl'
  const labels = root.dataset
  const template = root.querySelector('template[data-cart-line]')
  const list = root.querySelector('[data-cart-lines]')
  const form = root.querySelector('[data-cart-form]')
  const submit = form.querySelector('button[type="submit"]')
  const totalOut = root.querySelector('[data-cart-total]')
  const minOrder = Number(labels.minOrder) || 0
  const freeShipping = Number(labels.freeShipping) || 0
  const nudgeOut = root.querySelector('[data-cart-nudge]')
  const shippingOut = root.querySelector('[data-cart-shipping]')
  let lines = []

  // An item that is gone (hidden or deleted) drops out; one that is sold out,
  // or whose size is, stays listed but can't be ordered.
  function resolve (line) {
    const item = items[line.id]

    if (!item) {
      return null
    }

    const sizes = item.sizes || []
    const size = sizes.find(s => s.name === line.size)
    const sizeOk = line.size ? Boolean(size && !size.soldOut) : sizes.length === 0

    return {
      id: line.id,
      size: line.size || '',
      qty: clampQty(line.qty),
      item,
      price: Number(item.price) || 0,
      available: !item.soldOut && sizeOk,
    }
  }

  const ordered = () => lines.filter(line => line.available)
  const total = () => ordered().reduce((sum, line) => sum + line.price * line.qty, 0)
  const describe = line => (line.size ? `${line.item.title} (${line.size})` : line.item.title)

  const belowMinimum = () => total() < minOrder
  const freePostage = () => freeShipping > 0 && total() >= freeShipping
  const fill = (text, values) => text.replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match))

  // The line under the total nudges towards a bigger order: below the minimum,
  // what's missing to reach it (the send button is off); then, what's missing
  // to free postage; from there on, that postage is free. The small print
  // states the postage rule until it's met.
  function nudge (sum) {
    const text = nudgeOut.dataset
    if (belowMinimum()) {
      return fill(text.minimum, { min: formatPrice(minOrder, locale), rest: formatPrice(minOrder - sum, locale) })
    }
    if (!freeShipping) {
      return ''
    }
    return freePostage() ? text.free : fill(text.shipping, { rest: formatPrice(freeShipping - sum, locale) })
  }

  function updateTotal () {
    const sum = total()

    totalOut.textContent = formatPrice(sum, locale)
    nudgeOut.textContent = ordered().length ? nudge(sum) : ''
    nudgeOut.hidden = !nudgeOut.textContent
    shippingOut.hidden = !freeShipping || freePostage()
    shippingOut.textContent = fill(shippingOut.dataset.text, { free: formatPrice(freeShipping, locale) })
    submit.disabled = ordered().length === 0 || belowMinimum()
  }

  function renderLine (line) {
    const li = template.content.firstElementChild.cloneNode(true)
    const img = li.querySelector('[data-line-img]')
    const qty = li.querySelector('[data-line-qty]')
    const sum = li.querySelector('[data-line-sum]')
    const remove = li.querySelector('[data-line-remove]')
    const showSum = () => {
      sum.textContent = line.available && line.price ? formatPrice(line.price * line.qty, locale) : ''
    }

    li.querySelectorAll('[data-line-link]').forEach((a) => {
      a.href = line.item.url
    })
    li.querySelector('[data-line-title]').textContent = line.item.title
    li.querySelector('[data-line-meta]').textContent = [
      line.item.bands,
      line.size && `${labels.sizeLabel} ${line.size}`,
      line.price && formatPrice(line.price, locale),
    ].filter(Boolean).join(' · ')
    li.querySelector('[data-line-unavailable]').hidden = line.available
    li.classList.toggle('is-unavailable', !line.available)

    if (line.item.thumb) {
      img.src = line.item.thumb
    }
    else {
      img.remove()
    }

    qty.value = String(line.qty)
    qty.disabled = !line.available
    qty.setAttribute('aria-label', `${labels.qtyLabel}: ${describe(line)}`)
    qty.addEventListener('change', () => {
      line.qty = clampQty(qty.value)
      qty.value = String(line.qty)
      writeCart(lines)
      showSum()
      updateTotal()
    })

    remove.setAttribute('aria-label', `${labels.removeLabel}: ${describe(line)}`)
    remove.addEventListener('click', () => {
      const index = lines.indexOf(line)
      lines = lines.filter(l => l !== line)
      writeCart(lines)
      render()
      // Keep keyboard focus in the list (the line that took its place), or on
      // the empty state.
      const next = list.children[Math.min(index, list.children.length - 1)]
      const target = next ? next.querySelector('[data-line-remove]') : root.querySelector('[data-cart-empty] a')
      if (target) {
        target.focus()
      }
    })

    showSum()
    return li
  }

  function render () {
    const stored = readCart()
    lines = stored.map(resolve).filter(Boolean)
    if (lines.length !== stored.length) {
      writeCart(lines)
    }

    root.querySelector('[data-cart-empty]').hidden = lines.length > 0
    root.querySelector('[data-cart-filled]').hidden = lines.length === 0
    list.replaceChildren(...lines.map(renderLine))
    updateTotal()
  }

  // Delivery by post needs an address.
  function updateDelivery () {
    const post = form.querySelector('[data-cart-delivery="post"]').checked
    const address = root.querySelector('[data-cart-address]')
    address.hidden = !post
    address.querySelectorAll('[data-cart-required]').forEach((input) => {
      input.required = post
    })
  }

  // The app's live stock state: lines that sold out since the build can't be
  // ordered (items[id].soldOut, sizes[].soldOut), as if the page said so.
  function applyAvailability (availability) {
    Object.entries(items).forEach(([id, item]) => {
      const state = availability[id] || { available: false, sizes: {} }
      item.soldOut = !state.available
      ;(item.sizes || []).forEach((size) => {
        size.soldOut = state.sizes[size.name] === false
      })
    })
  }

  // The app refused lines that sold out in the meantime: mark them.
  function markSoldOut (lines) {
    lines.forEach(({ productId, size }) => {
      const item = items[productId]
      if (!item) {
        return
      }
      const entry = (item.sizes || []).find(s => s.name === size)
      if (entry) {
        entry.soldOut = true
      }
      else {
        item.soldOut = true
      }
    })
  }

  form.querySelectorAll('[data-cart-delivery]').forEach((radio) => {
    radio.addEventListener('change', updateDelivery)
  })

  // Send the order to the app (sendToBand, band-form.js), which prices it
  // again, checks stock and answers with the order number; then open this
  // language's thank-you page. A failed send keeps the visitor here, cart
  // intact, with an error message; lines that sold out meanwhile get marked.
  const error = form.querySelector('[data-form-error]')
  const stockError = form.querySelector('[data-cart-stock-error]')
  let sending = false

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const order = ordered()

    if (!order.length || belowMinimum() || sending) {
      return
    }

    const text = order.map((line) => {
      const parts = [`${line.qty} × ${line.item.title}`]
      if (line.item.bands) {
        parts.push(line.item.bands)
      }
      if (line.size) {
        parts.push(`${labels.sizeLabel} ${line.size}`)
      }
      if (line.price) {
        parts.push(formatPrice(line.price * line.qty, locale))
      }
      return parts.join(' — ')
    }).join('\n')
    const sum = formatPrice(total(), locale)
    const data = new FormData(form)
    const value = name => (data.get(name) || '').trim() || null
    const post = data.get('delivery') === 'post'
    const country = value('country')

    sending = true
    submit.disabled = true
    error.hidden = true
    stockError.hidden = true

    let result
    try {
      result = await sendToBand(`${labels.bandApi}/api/public/orders`, {
        items: order.map(line => ({ productId: line.id, size: line.size, qty: line.qty })),
        shipping: post ? (cartIsSlovenia(country) ? 'post' : 'abroad') : 'pickup',
        lang: locale === 'en' ? 'en' : 'sl',
        customer: {
          name: value('name'),
          email: value('email'),
          phone: value('phone'),
          street: post ? value('street') : null,
          postcode: post ? value('postcode') : null,
          city: post ? value('city') : null,
          country: post ? country : null,
          note: value('note'),
        },
        website: data.get('bot-field') || '',
      })
    }
    catch (err) {
      sending = false
      if (err.status === 409 && err.body && Array.isArray(err.body.detail)) {
        markSoldOut(err.body.detail)
        render()
        stockError.hidden = false
        stockError.focus()
        return
      }
      submit.disabled = false
      error.hidden = false
      error.focus()
      return
    }

    try {
      window.sessionStorage.setItem(CART_LAST_ORDER_KEY, JSON.stringify({ number: result.number, items: text, total: sum }))
    }
    catch {
      // Not essential: the thank-you page just won't repeat the order.
    }
    window.location.assign(labels.thanks)
  })

  root.hidden = false
  render()
  updateDelivery()
  merchAvailability().then((availability) => {
    if (availability && !sending) {
      applyAvailability(availability)
      render()
    }
  })

  // Another tab changed the cart, or the page came back from the back/forward cache.
  window.addEventListener('storage', (event) => {
    if (event.key === CART_KEY) {
      render()
    }
  })
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      render()
    }
  })
}

// Order thank-you page: show what was sent and empty the cart.
function orderDone () {
  const root = document.querySelector('[data-cart-done]')

  if (!root) {
    return
  }

  writeCart([])

  let order
  try {
    order = JSON.parse(window.sessionStorage.getItem(CART_LAST_ORDER_KEY))
  }
  catch {
    order = null
  }

  if (order && order.items) {
    root.querySelector('[data-cart-done-items]').textContent = order.items
    root.querySelector('[data-cart-done-total]').textContent = order.total
    const number = root.querySelector('[data-cart-done-number]')
    number.textContent = order.number || ''
    number.closest('p').hidden = !order.number
    root.hidden = false
  }
}

updateCartLink()
cartAdd()
cartPage()
orderDone()

window.addEventListener('storage', (event) => {
  if (event.key === CART_KEY) {
    updateCartLink()
  }
})
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    updateCartLink()
  }
})
