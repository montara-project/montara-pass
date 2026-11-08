// Firefox gives an extension page framed inside a web page no more than a
// content script gets: no storage.session, alarms, tabs, scripting or action.
// The inline menu needs them, so here they are asked of the background script
// instead (the frame: messages in src/entrypoints/background.ts), which does
// the same for the menu's own tab only. Chrome gives the frame the real ones,
// and this does nothing there.

import { fillLogin, fillNewPassword } from '../lib/autofill'

/** What the page runs, by name: a function cannot be sent in a message. */
const FILLS = new Map<unknown, string>([
  [fillLogin, 'fillLogin'],
  [fillNewPassword, 'fillNewPassword'],
])

if (!chrome.tabs) {
  const call = async (api: string, ...args: unknown[]) => {
    const answer = (await chrome.runtime.sendMessage({ type: 'frame:call', api, args })) as
      | { result?: unknown; error?: string }
      | undefined
    if (!answer || answer.error !== undefined) throw new Error(answer?.error ?? `${api} failed`)
    return answer.result
  }

  // Told of every change through a port, which is opened by the first listener.
  type Listener = (changes: Record<string, chrome.storage.StorageChange>) => void
  const listeners = new Set<Listener>()
  let port: chrome.runtime.Port | null = null
  const listen = () => {
    port = chrome.runtime.connect({ name: 'frame:session' })
    port.onMessage.addListener((keys: string[]) => {
      const changes = Object.fromEntries(keys.map((key) => [key, {}]))
      for (const listener of listeners) listener(changes)
    })
    // The event page went to sleep: the next change wakes it, and is heard.
    port.onDisconnect.addListener(() => {
      port = null
      if (listeners.size > 0 && chrome.runtime.id) setTimeout(listen, 1000)
    })
  }

  Object.assign(chrome.storage, {
    session: {
      get: (keys: unknown) => call('session.get', keys),
      set: (items: unknown) => call('session.set', items),
      remove: (keys: unknown) => call('session.remove', keys),
      onChanged: {
        addListener: (listener: Listener) => {
          listeners.add(listener)
          if (!port) listen()
        },
        removeListener: (listener: Listener) => listeners.delete(listener),
      },
    },
  })
  Object.assign(chrome, {
    alarms: {
      create: (name: string, info: unknown) => call('alarms.create', name, info),
      clear: (name: string) => call('alarms.clear', name),
    },
    tabs: {
      get: () => call('tabs.get'),
      sendMessage: (_tabId: number, message: unknown) => call('tabs.sendMessage', message),
      create: ({ url }: { url: string }) => call('tabs.create', url),
    },
    scripting: {
      executeScript: ({ func, args }: { func: unknown; args: unknown[] }) =>
        call('scripting.fill', FILLS.get(func), args),
    },
  })
}
