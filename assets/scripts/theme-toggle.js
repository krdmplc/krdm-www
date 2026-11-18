// Footer theme switcher. "auto" removes the stored choice so the site follows
// the device (prefers-color-scheme); "light"/"dark" set data-theme on <html>.
// layouts/partials/base/theme-init.html applies the stored choice on load.

const STORAGE_KEY = 'theme'

function readTheme () {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || 'auto'
  }
  catch {
    return 'auto'
  }
}

function writeTheme (theme) {
  try {
    if (theme === 'auto') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
    else {
      window.localStorage.setItem(STORAGE_KEY, theme)
    }
  }
  catch {
    // Storage blocked (private mode etc.): the choice just won't persist.
  }
}

function applyTheme (theme) {
  if (theme === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  }
  else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

function themeToggle () {
  const buttons = document.querySelectorAll('[data-theme-value]')

  if (!buttons.length) {
    return
  }

  const sync = (theme) => {
    buttons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeValue === theme))
    })
  }

  buttons.forEach((button) => {
    button.disabled = false
    button.addEventListener('click', () => {
      const theme = button.dataset.themeValue
      writeTheme(theme)
      applyTheme(theme)
      sync(theme)
    })
  })

  sync(readTheme())
}

themeToggle()
