// Netlify Forms, sent with fetch. Both languages of a form share its name
// (`contact`, `order`) and Netlify keeps only one success page per form, so a
// plain POST can land on the other language's thank-you page. Sending with
// fetch and then opening the form's own action keeps the language, and a
// failed send keeps the visitor on the form with its [data-form-error] message.
// Forms marked [data-netlify-send] get this on submit; without JS they still
// post normally. cart.js calls sendNetlifyForm() itself, after filling in the
// order.

async function sendNetlifyForm (form) {
  const response = await window.fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(new FormData(form)).toString(),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
}

function netlifyFormSend () {
  document.querySelectorAll('form[data-netlify-send]').forEach((form) => {
    const submit = form.querySelector('button[type="submit"]')
    const error = form.querySelector('[data-form-error]')
    let sending = false

    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      if (sending) {
        return
      }

      sending = true
      submit.disabled = true
      error.hidden = true

      try {
        await sendNetlifyForm(form)
      }
      catch {
        sending = false
        submit.disabled = false
        error.hidden = false
        error.focus()
        return
      }

      window.location.assign(form.getAttribute('action'))
    })
  })
}

netlifyFormSend()
