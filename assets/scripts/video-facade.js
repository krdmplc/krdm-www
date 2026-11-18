// Click-to-load YouTube (privacy-enhanced). The page ships only a local poster
// image; the youtube-nocookie.com iframe is created when the visitor presses play.

function videoFacade () {
  document.querySelectorAll('.video-facade[data-video-id]').forEach((facade) => {
    facade.addEventListener('click', () => {
      const iframe = document.createElement('iframe')
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(facade.dataset.videoId)}?autoplay=1`
      iframe.title = facade.dataset.videoTitle || ''
      iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'
      iframe.allowFullscreen = true

      const wrapper = document.createElement('div')
      wrapper.className = 'video-facade'
      wrapper.appendChild(iframe)
      facade.replaceWith(wrapper)
      iframe.focus()
    }, { once: true })
  })
}

videoFacade()
