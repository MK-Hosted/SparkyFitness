export default defineNuxtConfig({
  // https://github.com/nuxt-themes/docus
  extends: ['@nuxt-themes/docus'],

  devtools: { enabled: true },

  app: {
    baseURL: '/SparkyFitness/'
  },

  modules: [
    // Remove it if you don't use Plausible analytics
    // https://github.com/nuxt-modules/plausible
    //'@nuxtjs/plausible'
  ],

  content: {
    locales: ['en'],
    defaultLocale: 'en',
    base: '/SparkyFitness/',
    sources: {
      content: {
        driver: 'fs',
        base: './content'
      }
    }
  },

  compatibilityDate: '2024-09-07'
})