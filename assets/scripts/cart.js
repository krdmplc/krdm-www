// Merch cart. There is no checkout: the cart lives in this browser
// (localStorage) as [{ id, size, qty }] and is sent to us as a Netlify Forms
// order from the cart page (layouts/shortcodes/cart.html), which also holds the
// titles, prices and stock state as JSON. Item pages add to it
// ([data-cart-add]), the header shows the count ([data-cart-link]), and the
// order thank-you page ([data-cart-done]) shows what was sent and empties it.
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

// KRDM-YYMM-XXXX: short enough to quote in an email, random enough not to clash.
// 32 symbols (no 0/O, 1/I) divide 256 evenly, so every symbol is equally likely.
function orderNumber () {
  const symbols = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const now = new Date()
  const month = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`
  const random = Array.from(window.crypto.getRandomValues(new Uint8Array(4)), n => symbols[n % symbols.length]).join('')
  return `KRDM-${month}-${random}`
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

    form.hidden = false
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
  const field = name => form.querySelector(`[data-cart-field="${name}"]`)
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

  function updateTotal () {
    totalOut.textContent = formatPrice(total(), locale)
    submit.disabled = ordered().length === 0
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
    address.querySelector('textarea').required = post
  }

  form.querySelectorAll('[data-cart-delivery]').forEach((radio) => {
    radio.addEventListener('change', updateDelivery)
  })

  // Write the order into the hidden fields Netlify emails to us.
  form.addEventListener('submit', (event) => {
    const order = ordered()

    if (!order.length) {
      event.preventDefault()
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
    const number = orderNumber()

    field('number').value = number
    field('items').value = text
    field('total').value = sum

    try {
      window.sessionStorage.setItem(CART_LAST_ORDER_KEY, JSON.stringify({ number, items: text, total: sum }))
    }
    catch {
      // Not essential: the thank-you page just won't repeat the order.
    }
  })

  root.hidden = false
  render()
  updateDelivery()

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
