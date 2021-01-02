function mainMenu () {
  const toggleButton = document.querySelector('.main-menu__button')
  const itemsEl = document.querySelector('.main-menu__items')
  const menuIcon = document.querySelector('.menu-icon')

  const openMenu = () => {
    itemsEl.classList.add('is-open')
    toggleButton.dataset.expanded = 'true'
    menuIcon.classList.add('is-open')
  }

  const closeMenu = () => {
    itemsEl.classList.remove('is-open')
    toggleButton.dataset.expanded = 'false'
    menuIcon.classList.remove('is-open')
  }

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
