function mainMenu () {
  const toggleButton = document.querySelector('.main-menu__button')
  const itemsEl = document.querySelector('.main-menu__items')
  const menuIcon = document.querySelector('.menu-icon')
  const menuLinks = []

  const openMenu = () => {
    itemsEl.classList.add('is-open')
    toggleButton.dataset.expanded = 'true'
    menuIcon.classList.add('is-open')
    // document.body.classList.add('overflow-hidden');
  }

  const closeMenu = () => {
    itemsEl.classList.remove('is-open')
    toggleButton.dataset.expanded = 'false'
    menuIcon.classList.remove('is-open')
    // document.body.classList.remove('overflow-hidden');
  }

  const updateMenuActiveLinks = () => {
    window.addEventListener('scroll', () => {
      const headerHeight = document.querySelector('.header').offsetHeight
      const fromTop = window.scrollY + headerHeight

      menuLinks.forEach((link) => {
        let section = null

        if (link.hash) {
          section = document.querySelector(link.hash)
        }

        if (section !== null) {
          if (
            section.offsetTop <= fromTop &&
              section.offsetTop + section.offsetHeight > fromTop
          ) {
            link.parentNode.classList.add('active')
            if (window.history.pushState) {
              window.history.pushState(null, null, link.hash)
            } else {
              window.location.hash = link.hash
            }
          } else {
            link.parentNode.classList.remove('active')
          }
        }
      })
    })
  }

  updateMenuActiveLinks()

  toggleButton.addEventListener('click', () => {
    if (toggleButton.dataset.expanded === 'true') {
      closeMenu()
    } else {
      openMenu()
    }
  })

  document.addEventListener('click', (event) => {
    if (!itemsEl.contains(event.target) &&
      !toggleButton.contains(event.target) &&
      itemsEl.classList.contains('is-open')) {
      closeMenu()
    }
  })
}

mainMenu()
