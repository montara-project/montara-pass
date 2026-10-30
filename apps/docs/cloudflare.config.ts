import { defineConfig, defineWorker } from 'cf/config'

export default defineConfig({
  worker: defineWorker({
    name: 'montara-pass-docs',
    entrypoint: '@tanstack/react-start/server-entry',
    compatibilityDate: '2026-10-23',
    compatibilityFlags: ['nodejs_compat'],
    domains: ['docs.montarapass.com'],
  }),
})
