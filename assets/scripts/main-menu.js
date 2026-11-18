// Toggles the off-canvas main menu. The toggle is a real <button> with
// aria-expanded/aria-controls, so it works with keyboard and screen readers.

function mainMenu () {
  const toggle = document.querySelector('.main-menu__toggle')
  const items = toggle && document.getElementById(toggle.getAttribute('aria-controls'))

  if (!toggle || !items) {
    return
  }

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open))
    items.classList.toggle('is-open', open)
  }

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true'

  toggle.addEventListener('click', () => setOpen(!isOpen()))

  document.addEventListener('click', (event) => {
    if (isOpen() && !items.contains(event.target) && !toggle.contains(event.target)) {
      setOpen(false)
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false)
      toggle.focus()
    }
  })
}

mainMenu()
