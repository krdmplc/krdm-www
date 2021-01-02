module.exports = {
  plugins: {
    '@fullhuman/postcss-purgecss': {
      content: [
        './layouts/**/*.html',
        './assets/scripts/*.js',
      ],
      whitelist: [
        // add classes found only in js
      ],
    },
    cssnano: { preset: 'default' },
  },
}
