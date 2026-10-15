import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'

import pkg from './package.json' with { type: 'json' }

type Target = 'chrome' | 'firefox'

const ALL_SITES = ['http://*/*', 'https://*/*']

// VITE_EDITION=ce builds the Community Edition (no sign-up, no sharing; see
// app/src/lib/constants/edition.ts) into its own folder, under its own name
// and add-on id, so it installs next to the Enterprise Edition.
const COMMUNITY = process.env.VITE_EDITION === 'ce'
const NAME = COMMUNITY ? 'Montara Pass CE' : 'Montara Pass'

/**
 * The manifest, which is where the two browsers differ: Chrome runs the
 * background script as a service worker, Firefox as an event page, and
 * Firefox wants an add-on id.
 */
function manifest(target: Target) {
  return {
    manifest_version: 3,
    name: NAME,
    version: pkg.version,
    description: 'Fill and save logins from your end-to-end encrypted Montara Pass vault.',
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    action: {
      default_title: NAME,
      default_popup: 'popup.html',
      default_icon: { 16: 'icons/16.png', 32: 'icons/32.png' },
    },
    // activeTab + scripting fill the page the user is looking at.
    permissions: ['storage', 'activeTab', 'scripting', 'alarms', 'clipboardWrite'],
    // Every site: the inline menu looks for login fields on each page, and
    // the server may be a self-hosted one at any address.
    host_permissions: ALL_SITES,
    content_scripts: [
      { matches: ALL_SITES, js: ['content.js'], run_at: 'document_idle' },
      // In the page's own world and ahead of its scripts: it stands in for
      // navigator.credentials, which only the page's world can replace.
      { matches: ALL_SITES, js: ['passkey-page.js'], run_at: 'document_start', world: 'MAIN' },
    ],
    // The inline menu is an extension page framed inside the login page.
    web_accessible_resources: [{ resources: ['inline.html'], matches: ALL_SITES }],
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
            gecko: {
              id: COMMUNITY ? 'montara-pass-ce@montarapass.com' : 'montara-pass@montarapass.com',
              // The first releases that read data_collection_permissions:
              // 140 on desktop, 142 on Android.
              strict_min_version: '140.0',
              // What leaves the browser, shown in Firefox's install prompt.
              // The sign-in email and password go to the API, and so does
              // the vault, as ciphertext. Nothing is collected about usage
              // or browsing.
              data_collection_permissions: {
                required: ['authenticationInfo', 'personallyIdentifyingInfo'],
              },
            },
            gecko_android: { strict_min_version: '142.0' },
          },
        }
      : {}),
  }
}

/**
 * Dependencies ship code the add-on linter flags. Two pieces the extension
 * never runs: zod probes for eval before compiling a parser (an extension
 * page's CSP refuses it, so zod always falls back), and react-dom assigns
 * innerHTML for dangerouslySetInnerHTML, which nothing here uses. Both are
 * swapped for a throw, so neither can come into use unnoticed. The notes
 * editor's three are code that does run, and each is replaced by an
 * equivalent the linter accepts (see the rules).
 */
function dropFlaggedCode(): Plugin {
  const rules = [
    {
      file: /zod\/v4\/core\/(util|doc)\.js$/,
      from: /const F = Function;/g,
      to: "const F = function () { throw new Error('eval is not available in the extension') };",
    },
    {
      file: /react-dom-client\.production\.js$/,
      from: /\(domElement\.innerHTML = key\)/g,
      to: "(() => { throw new Error('dangerouslySetInnerHTML is not available in the extension') })()",
    },
    // The notes editor (Milkdown, on ProseMirror and micromark). ProseMirror
    // parses pasted HTML by assigning innerHTML on a detached document;
    // the browser's DOMParser gives the same nodes without the assignment.
    // (`globalThis.`, because the file has ProseMirror's own DOMParser in scope.)
    {
      file: /prosemirror-view\/dist\/index\.js$/,
      from: /elt\.innerHTML = maybeWrapTrusted\(html\);/g,
      to: "elt.replaceChildren(...new globalThis.DOMParser().parseFromString(maybeWrapTrusted(html), 'text/html').body.childNodes);",
    },
    // Not document.write: micromark's tokenizer for the `document` content
    // type has a method called `write`. Called through a variable, the
    // linter no longer mistakes it for one.
    {
      file: /mdast-util-from-markdown\/lib\/index\.js$/,
      from: /postprocess\(parse\(options\)\.document\(\)\.write\(preprocess\(\)\(value, encoding, true\)\)\)/g,
      to: '((feed) => postprocess(feed(preprocess()(value, encoding, true))))(parse(options).document().write)',
    },
  ]
  const seen = new Set<RegExp>()

  return {
    name: 'montara-pass-drop-flagged-code',
    // Ahead of Vite's own resolver, which would settle the import below.
    enforce: 'pre',
    // micromark decodes `&amp;` and its kind through innerHTML in a browser
    // build; the package's other build looks them up in a table.
    async resolveId(source, importer, options) {
      if (source !== 'decode-named-character-reference') return null
      const found = await this.resolve(source, importer, { ...options, skipSelf: true })
      return found && { ...found, id: found.id.replace('index.dom.js', 'index.js') }
    },
    transform(code, id) {
      for (const rule of rules) {
        const replaced = rule.file.test(id) ? code.replace(rule.from, rule.to) : code
        if (replaced !== code) {
          seen.add(rule.file)
          return replaced
        }
      }
    },
    buildEnd() {
      // A dependency update that moves the code brings the warnings back.
      for (const rule of rules) {
        if (!seen.has(rule.file)) this.error(`Nothing left to replace in ${rule.file}`)
      }
    },
  }
}

const outDir = (target: Target) => `dist/${target}${COMMUNITY ? '-ce' : ''}`

function emitManifest(target: Target): Plugin {
  return {
    name: 'montara-pass-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest(target), null, 2),
      })
    },
    // Finder leaves one in public/, Vite copies it, and the add-on linter
    // flags it.
    closeBundle() {
      fs.rmSync(path.resolve(import.meta.dirname, `${outDir(target)}/.DS_Store`), { force: true })
    },
  }
}

export default defineConfig(({ mode }) => {
  const target: Target = process.env.TARGET === 'firefox' ? 'firefox' : 'chrome'
  const env = loadEnv(mode, import.meta.dirname, 'VITE_')
  // `pnpm watch` builds in development mode, against the local servers.
  const dev = mode === 'development'

  return {
    plugins: [react(), tailwindcss(), dropFlaggedCode(), emitManifest(target)],
    resolve: {
      // The sidebar comes from the web app, whose packages would otherwise
      // bring a second React.
      dedupe: ['react', 'react-dom'],
      alias: {
        // The crypto and the API models are the web app's own: the extension
        // must read and write exactly the same ciphertext.
        '@': path.resolve(import.meta.dirname, '../app/src'),
      },
    },
    define: {
      'import.meta.env.VITE_DEFAULT_API_URL': JSON.stringify(
        env.VITE_DEFAULT_API_URL || (dev ? 'http://localhost:8080' : 'https://app.montarapass.com')
      ),
      'import.meta.env.VITE_DEFAULT_APP_URL': JSON.stringify(
        env.VITE_DEFAULT_APP_URL || (dev ? 'http://localhost:5173' : 'https://app.montarapass.com')
      ),
    },
    build: {
      outDir: outDir(target),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: path.resolve(import.meta.dirname, 'popup.html'),
          inline: path.resolve(import.meta.dirname, 'inline.html'),
          background: path.resolve(import.meta.dirname, 'src/background.ts'),
          // A content script cannot be a module: like
          // the background script it imports nothing and stays one file.
          content: path.resolve(import.meta.dirname, 'src/content.ts'),
          'passkey-page': path.resolve(import.meta.dirname, 'src/passkey-page.ts'),
        },
        output: {
          // The manifest names background.js and content.js, so entries keep
          // their names.
          entryFileNames: '[name].js',
        },
      },
    },
  }
})
