// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    replicateApiToken: process.env.REPLICATE_API_TOKEN || '',
    uploadApiKey: process.env.UPLOAD_API_KEY || '',
    uploadAccountId: process.env.UPLOAD_ACCOUND_ID || ''
  },
  ssr: false,
  nitro: {
    preset: 'vercel-edge'
  },
  sourcemap: {
    server: false,
    client: false
  },
  modules: ['@pinia/nuxt'],
  css: ['assets/styles.css']
})
