// Merch pages link to the contact form with ?item=<name>. Start the message
// with the item, so the visitor only has to add sizes, quantity and the like.

function contactPrefill () {
  const message = document.querySelector('textarea[data-prefill]')
  const item = new URLSearchParams(window.location.search).get('item')

  if (!message || !item || message.value) {
    return
  }

  message.value = `${message.dataset.prefill} ${item.slice(0, 200)}\n\n`
}

contactPrefill()
