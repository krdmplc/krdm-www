// The website's forms go to KRDM band, the app at band.krdm.si (the form's
// action, from params.bandApi): the contact form to /api/public/contact, the
// order (cart.js) to /api/public/orders. The app stores them and notifies us.
// Sent as JSON with fetch, then this language's thank-you page is opened, so a
// failed send keeps the visitor on the form with its [data-form-error] message.
// Forms marked [data-band-send] get this on submit. Without JS the contact form
// still posts to the app, which sends the browser on to the form's `thanks` page.

// Resolves to the app's JSON answer; rejects with .status and .body on an error.
async function sendToBand (url, data) {
  const response = await window.fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  let body = null
  try {
    body = await response.json()
  }
  catch {
    // No JSON: the status says enough.
  }
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`)
    error.status = response.status
    error.body = body
    throw error
  }
  return body
}

function bandFormSend () {
  document.querySelectorAll('form[data-band-send]').forEach((form) => {
    const submit = form.querySelector('button[type="submit"]')
    const error = form.querySelector('[data-form-error]')
    let sending = false

    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      if (sending) {
        return
      }

      // The honeypot goes as `website`; `thanks` is only for the no-JS path.
      const data = Object.fromEntries(new FormData(form))
      data.website = data['bot-field'] || ''
      delete data['bot-field']
      const thanks = data.thanks
      delete data.thanks

      sending = true
      submit.disabled = true
      error.hidden = true

      try {
        await sendToBand(form.action, data)
      }
      catch {
        sending = false
        submit.disabled = false
        error.hidden = false
        error.focus()
        return
      }

      window.location.assign(thanks)
    })
  })
}

bandFormSend()
