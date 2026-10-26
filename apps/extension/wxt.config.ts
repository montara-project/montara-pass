import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'wxt'

const ALL_SITES = ['http://*/*', 'https://*/*']

// VITE_EDITION=community builds the Community Edition (no sign-up, no sharing; see
// packages/shared/src/constants/edition.ts) into its own folder, under its own name
// and add-on id, so it installs next to the Cloud Edition.
const COMMUNITY = process.env.VITE_EDITION === 'community'
const NAME = COMMUNITY ? 'Montara Pass CE' : 'Montara Pass'

/**
 * Dependencies ship code the add-on linter flags. Two pieces the extension
 * never runs: zod probes for eval before compiling a parser (an extension
 * page's CSP refuses it, so zod always falls back), and react-dom assigns
 * innerHTML for dangerouslySetInnerHTML, which nothing here uses. Both are
 * swapped for a throw, so neither can come into use unnoticed. The notes
 * editor's three are code that does run, and each is replaced by an
 * equivalent the linter accepts (see the rules).
 */
const FLAGGED_CODE = [
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
// WXT builds the pages, the background and each content script apart, so
// the rules are checked once all of them are done (in build:done).
const replaced = new Set<RegExp>()

function dropFlaggedCode(): Plugin {
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
      for (const rule of FLAGGED_CODE) {
        const next = rule.file.test(id) ? code.replace(rule.from, rule.to) : code
        if (next !== code) {
          replaced.add(rule.file)
          return next
        }
      }
    },
  }
}

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  // No auto-imports: every file names what it uses.
  imports: false,
  // WXT builds Firefox as Manifest V2 unless told otherwise.
  manifestVersion: 3,
  outDir: 'dist',
  outDirTemplate: `{{browser}}${COMMUNITY ? '-ce' : ''}{{modeSuffix}}`,
  zip: {
    artifactTemplate: `montarapass${COMMUNITY ? '-ce' : ''}-{{browser}}.zip`,
    // The extension builds from the whole workspace (the web app's sidebar,
    // @montara-pass/shared), which a sources ZIP of this folder would miss.
    zipSources: false,
  },
  // The manifest, which is where the two browsers differ: Chrome runs the
  // background script as a service worker, Firefox as an event page, and
  // Firefox wants an add-on id. The content scripts, the background and the
  // popup are declared in src/entrypoints.
  manifest: ({ browser }) => ({
    name: NAME,
    description: 'Fill and save logins from your end-to-end encrypted Montara Pass vault.',
    action: { default_icon: { 16: 'icons/16.png', 32: 'icons/32.png' } },
    // activeTab + scripting fill the page the user is looking at. Chrome's
    // service worker wipes the clipboard from an offscreen page; Firefox has
    // no such permission and does it from its event page.
    permissions: [
      'storage',
      'activeTab',
      'scripting',
      'alarms',
      'clipboardWrite',
      ...(browser === 'chrome' ? ['offscreen'] : []),
    ],
    // Every site: the inline menu looks for login fields on each page, and
    // the server may be a self-hosted one at any address.
    host_permissions: ALL_SITES,
    // The inline menu is an extension page framed inside the login page.
    web_accessible_resources: [{ resources: ['inline.html'], matches: ALL_SITES }],
    // Argon2id runs as WebAssembly, which extension pages may not compile
    // without this.
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
    ...(browser === 'firefox'
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
  }),
  vite: ({ mode }) => {
    const env = loadEnv(mode, import.meta.dirname, 'VITE_')
    // `pnpm watch` runs in development mode, against the local servers.
    const dev = mode === 'development'

    return {
      plugins: [tailwindcss(), dropFlaggedCode()],
      resolve: {
        // The sidebar comes from the web app, whose packages would otherwise
        // bring a second React.
        dedupe: ['react', 'react-dom'],
      },
      define: {
        'import.meta.env.VITE_DEFAULT_API_URL': JSON.stringify(
          env.VITE_DEFAULT_API_URL ||
            (dev ? 'http://localhost:8080' : 'https://app.montarapass.com')
        ),
        'import.meta.env.VITE_DEFAULT_APP_URL': JSON.stringify(
          env.VITE_DEFAULT_APP_URL ||
            (dev ? 'http://localhost:5173' : 'https://app.montarapass.com')
        ),
      },
    }
  },
  hooks: {
    'config:resolved'(wxt) {
      // The sidebar and notes editor UI are the web app's own. The crypto and
      // the API models come from @montara-pass/shared. WXT points `@` at src,
      // so it is pointed back here.
      wxt.config.alias['@'] = path.resolve(import.meta.dirname, '../app/src')
    },
    'build:manifestGenerated'(_, manifest) {
      // WXT adds every icon in public/icons to what is set here, 256 too.
      manifest.icons = {
        16: 'icons/16.png',
        32: 'icons/32.png',
        48: 'icons/48.png',
        128: 'icons/128.png',
      }
      // WXT takes the popup's <title>, which is the same in both editions.
      manifest.action!.default_title = NAME
    },
    'build:publicAssets'(_, files) {
      // Finder leaves one in public/, and the add-on linter flags it.
      const kept = files.filter((file) => !file.relativeDest.endsWith('.DS_Store'))
      files.splice(0, files.length, ...kept)
    },
    'build:done'(wxt) {
      // A dependency update that moves the code brings the warnings back.
      // The dev server transforms files only once they are asked for.
      if (wxt.config.command !== 'build') return
      for (const rule of FLAGGED_CODE) {
        if (!replaced.has(rule.file)) throw new Error(`Nothing left to replace in ${rule.file}`)
      }
    },
  },
})
