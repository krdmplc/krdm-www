// Toggles the full-screen mobile menu. The toggle is a real <button> with
// aria-expanded/aria-controls, so it works with keyboard and screen readers.
// While open, page scrolling is locked (.has-menu-open on <html>).

function mainMenu () {
  const toggle = document.querySelector('.main-menu__toggle')
  const items = toggle && document.getElementById(toggle.getAttribute('aria-controls'))

  if (!toggle || !items) {
    return
  }

  // Matches the "md" breakpoint in hugo.toml, where the menu goes inline.
  const desktop = window.matchMedia('(min-width: 992px)')

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open))
    items.classList.toggle('is-open', open)
    document.documentElement.classList.toggle('has-menu-open', open)
  }

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true'

  toggle.addEventListener('click', () => setOpen(!isOpen()))

  // Following a link (including same-page anchors) closes the menu.
  items.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      setOpen(false)
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false)
      toggle.focus()
    }
  })

  // Rotating or resizing to the desktop layout resets the mobile menu.
  desktop.addEventListener('change', (event) => {
    if (event.matches) {
      setOpen(false)
    }
  })
}

mainMenu()
