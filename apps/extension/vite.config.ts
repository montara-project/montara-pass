import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'

import pkg from './package.json' with { type: 'json' }

type Target = 'chrome' | 'firefox'

/**
 * The manifest, which is where the two browsers differ: Chrome runs the
 * background script as a service worker, Firefox as an event page, and
 * Firefox wants an add-on id.
 */
function manifest(target: Target, apiUrl: string) {
  return {
    manifest_version: 3,
    name: 'Montara Pass',
    version: pkg.version,
    description: 'Fill and save logins from your end-to-end encrypted Montara Pass vault.',
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    action: {
      default_title: 'Montara Pass',
      default_popup: 'popup.html',
      default_icon: { 16: 'icons/16.png', 32: 'icons/32.png' },
    },
    // activeTab + scripting fill the page the user is looking at, and only
    // when they click Fill: the extension reads no page on its own.
    permissions: ['storage', 'activeTab', 'scripting', 'alarms', 'clipboardWrite'],
    // The API the build points at. Another one, set in the popup's settings,
    // is requested from the optional list at that moment.
    host_permissions: [`${new URL(apiUrl).origin}/*`],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    background:
      target === 'chrome'
        ? { service_worker: 'background.js', type: 'module' }
        : { scripts: ['background.js'], type: 'module' },
    // Argon2id runs as WebAssembly, which extension pages may not compile
    // without this.
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
    ...(target === 'firefox'
      ? {
          browser_specific_settings: {
            // 128 is the first release with optional_host_permissions in MV3.
            gecko: { id: 'montara-pass@montara-project.dev', strict_min_version: '128.0' },
          },
        }
      : {}),
  }
}

function emitManifest(target: Target, apiUrl: string): Plugin {
  return {
    name: 'montara-pass-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest(target, apiUrl), null, 2),
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const target: Target = process.env.TARGET === 'firefox' ? 'firefox' : 'chrome'
  const env = loadEnv(mode, import.meta.dirname, 'VITE_')
  const apiUrl = env.VITE_DEFAULT_API_URL || 'http://localhost:8080'

  return {
    plugins: [react(), emitManifest(target, apiUrl)],
    resolve: {
      alias: {
        // The crypto and the API models are the web app's own: the extension
        // must read and write exactly the same ciphertext.
        '@': path.resolve(import.meta.dirname, '../app/src'),
      },
    },
    define: {
      'import.meta.env.VITE_DEFAULT_API_URL': JSON.stringify(apiUrl),
      'import.meta.env.VITE_DEFAULT_APP_URL': JSON.stringify(
        env.VITE_DEFAULT_APP_URL || 'http://localhost:5173'
      ),
    },
    build: {
      outDir: `dist/${target}`,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: path.resolve(import.meta.dirname, 'popup.html'),
          background: path.resolve(import.meta.dirname, 'src/background.ts'),
        },
        output: {
          // The manifest names background.js, so entries keep their names.
          entryFileNames: '[name].js',
        },
      },
    },
  }
})
