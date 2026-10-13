// The page side of the inline menu: a badge inside the focused login field and
// a frame under it that holds the menu (inline.html). The manifest runs it on
// every page, in the top frame only. It also notices a login being submitted
// and frames the prompt that offers to save it (inline.html#save). On a page
// that asks for a login it frames, in the same corner, the logins the vault
// has for the site (inline.html#offer).
//
// It never sees the vault: the frames are extension pages, which the page
// around them can neither read nor script, and the menu fills the form itself.
// A login the user typed into the page is passed on to the background script.
// A request for a passkey comes from src/passkey-page.ts and is answered by a
// third frame (inline.html#passkey); the answer passes through here on its way
// back to the page that asked.
// Like the background script it imports nothing, so it stays a single file
// the manifest can name as a content script.
// Keep the message names in sync with src/inline/main.tsx and src/passkey-page.ts.

;(() => {
  const FRAME_URL = chrome.runtime.getURL('inline.html')
  const ORIGIN = window.location.origin
  const BADGE = 24
  const MAX_HEIGHT = 320

  let field: HTMLInputElement | null = null
  let frame: HTMLIFrameElement | null = null
  let frameHeight = 56
  /** The menu was turned down on this page: it no longer opens by itself. */
  let dismissed = false
  let saveFrame: HTMLIFrameElement | null = null
  let watch = 0
  let offerFrame: HTMLIFrameElement | null = null
  /** The offer was made on this page, taken or not: it is made once. */
  let offered = false
  /** The request the page is waiting on, as it sent it: the prompt reads it. */
  let passkey: { id: string } | null = null
  let passkeyFrame: HTMLIFrameElement | null = null
  let passkeyTimer = 0

  // A popover sits in the top layer, above whatever the page stacks. The
  // styles are inline and important, so a page stylesheet cannot restyle it.
  const host = document.createElement('div')
  host.setAttribute('popover', 'manual')
  host.style.cssText = [
    'all: initial',
    'position: fixed',
    'inset: 0 auto auto 0',
    'width: 0',
    'height: 0',
    'margin: 0',
    'padding: 0',
    'border: 0',
    'overflow: visible',
    'background: none',
    'z-index: 2147483647',
  ]
    .map((rule) => `${rule} !important`)
    .join(';')

  const shadow = host.attachShadow({ mode: 'closed' })
  shadow.innerHTML = `
    <style>
      button, iframe { position: fixed; margin: 0; }
      [hidden] { display: none; }
      button {
        display: grid; place-items: center;
        width: ${BADGE}px; height: ${BADGE}px; padding: 0;
        border: 0; border-radius: 7px; cursor: pointer;
        background: linear-gradient(160deg, #145cff, #42c8ff); color: #101d3a;
      }
      button:hover { filter: brightness(1.08); }
      iframe {
        border: 0; border-radius: 14px; color-scheme: light dark;
        box-shadow: 0 8px 24px rgb(0 0 0 / 0.35), 0 0 0 1px rgb(127 127 127 / 0.25);
      }
    </style>
    <button type="button" tabindex="-1" hidden aria-label="Montara Pass: show logins for this site" title="Montara Pass (Alt+↓)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
        <circle cx="12" cy="10" r="3" fill="currentColor" stroke="none" />
        <path d="M12 12v5" />
      </svg>
    </button>`
  const badge = shadow.querySelector('button')!

  const usable = (el: HTMLInputElement) => {
    const style = getComputedStyle(el)
    return (
      !el.disabled &&
      !el.readOnly &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      el.getClientRects().length > 0
    )
  }

  /**
   * A password field, or the text field that goes with one: in the same form,
   * or anywhere on a page without forms. A field that says it takes a
   * username or an email counts on its own, for sign-ins that ask for the
   * password on a second step.
   */
  // ponytail: by name alone, so a newsletter box on a site with a saved login
  // counts too. Tell them apart by the form around the field if that annoys.
  const isLoginField = (target: EventTarget | null): target is HTMLInputElement => {
    if (!(target instanceof HTMLInputElement) || !usable(target)) return false
    if (target.type === 'password') return true
    if (!['text', 'email', 'tel'].includes(target.type)) return false
    if (target.type === 'email' || /user|email|login/i.test(target.autocomplete)) return true
    if (/user|email|login/i.test(`${target.name} ${target.id}`)) return true

    const scope: ParentNode = target.form ?? document
    return Array.from(scope.querySelectorAll<HTMLInputElement>('input[type="password"]')).some(
      usable
    )
  }

  const SIGN_UP = /sign.?up|regist|join|creat|daftar|new.?(user|account)/i

  /**
   * A password field that is choosing a password rather than giving one: it
   * says so, it comes with a field to repeat it, or the form or the address
   * reads like a sign-up. The menu then offers a generated one.
   */
  const isNewPassword = (el: HTMLInputElement) => {
    if (el.type !== 'password' || el.autocomplete === 'current-password') return false
    if (el.autocomplete === 'new-password') return true

    const scope: ParentNode = el.form ?? document
    const passwords = scope.querySelectorAll<HTMLInputElement>('input[type="password"]')
    if (Array.from(passwords).filter(usable).length > 1) return true

    // getAttribute: a field named "id" or "action" hides the form's own.
    const form = ['id', 'name', 'action'].map((name) => el.form?.getAttribute(name) ?? '')
    return SIGN_UP.test(`${location.pathname} ${form.join(' ')}`)
  }

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))

  const place = () => {
    if (!field) return

    const rect = field.getBoundingClientRect()
    if (!field.isConnected || rect.width < 120 || rect.height < BADGE) {
      hide()
      return
    }

    badge.style.left = `${rect.right - BADGE - 8}px`
    badge.style.top = `${rect.top + (rect.height - BADGE) / 2}px`

    if (frame) {
      const width = Math.min(Math.max(rect.width, 280), 360, window.innerWidth - 16)
      const below = rect.bottom + 6
      // Under the field, unless only the space above it is tall enough.
      const fitsBelow = below + frameHeight <= window.innerHeight - 8
      const fitsAbove = rect.top - 6 - frameHeight >= 8

      frame.style.width = `${width}px`
      frame.style.height = `${frameHeight}px`
      frame.style.left = `${clamp(rect.left, 8, window.innerWidth - width - 8)}px`
      frame.style.top = `${fitsBelow || !fitsAbove ? below : rect.top - 6 - frameHeight}px`
    }
  }

  /** (Re)enter the top layer, on top of anything the page put there since. */
  const raise = () => {
    if (!host.isConnected) document.documentElement.append(host)
    try {
      host.hidePopover()
    } catch {
      // Not shown yet.
    }
    try {
      host.showPopover()
    } catch {
      // No popover support: the z-index still applies.
    }
  }

  const show = (el: HTMLInputElement) => {
    if (field !== el) close()
    field = el
    badge.hidden = false
    raise()
    place()
    // The logins for the site, offered as soon as an empty field is entered,
    // unless the corner of the page is offering them already.
    if (!el.value && !dismissed && !offerShown()) open(true)
  }

  const close = () => {
    frame?.remove()
    frame = null
    frameHeight = 56
  }

  // inline.html can be framed by the page as well, so a frame made here has
  // to be told from a copy. Each one is sent a token through its own window,
  // which only an extension page can receive, and sends it back with every
  // message. A copy has none to send. (The browser does not say which frame a
  // message came from: Chrome leaves the sender's frame id out here.)
  const tokens = new WeakMap<HTMLIFrameElement, string>()

  const greet = (target: HTMLIFrameElement) => {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('')
    tokens.set(target, token)
    target.addEventListener('load', () =>
      target.contentWindow?.postMessage({ montaraPassFrame: token }, new URL(FRAME_URL).origin)
    )
  }

  /** Take the host out of the page once nothing in it is left to show. */
  const release = () => {
    if (!field && !saveFrame && !passkeyFrame && !offerFrame) host.remove()
  }

  const hide = () => {
    close()
    field = null
    badge.hidden = true
    // The prompts live in the same host and outlast the field.
    release()
  }

  /** @param auto opened by the focus alone, not by the badge or the keyboard */
  const open = (auto = false) => {
    if (frame || !field) return

    frame = document.createElement('iframe')
    greet(frame)
    const flags = [auto && 'auto', isNewPassword(field) && 'new'].filter(Boolean)
    frame.src = `${FRAME_URL}#${flags.join(',')}`
    frame.title = 'Montara Pass'
    // Nobody asked for it, so it stays out of sight until the menu says it
    // has a login to offer. Transparent rather than empty: see offerSave.
    if (auto) frame.style.cssText = 'opacity: 0; pointer-events: none'
    shadow.append(frame)
    raise()
    place()
  }

  /**
   * Whether a frame is really what the user is looking at. A page can fade
   * the host out or cover it, and so borrow a click meant for something else.
   */
  // ponytail: an overlay with pointer-events: none above the top layer is not
  // seen by elementFromPoint; IntersectionObserver v2 inside the frame closes
  // that gap once Firefox ships it.
  const isVisible = (frame: HTMLIFrameElement | null) => {
    if (!frame || !host.isConnected) return false

    for (const el of [host, document.documentElement]) {
      const style = getComputedStyle(el)
      if (Number(style.opacity) < 1 || style.visibility !== 'visible' || style.filter !== 'none') {
        return false
      }
    }

    const rect = frame.getBoundingClientRect()
    return (
      document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === host
    )
  }

  const toBackground = (message: object): Promise<unknown> =>
    // The extension was updated or removed under a page that is still open.
    chrome.runtime.sendMessage(message).catch(() => undefined)

  /** Frame the save prompt, if a login submitted in this tab is waiting. */
  const offerSave = async () => {
    if (saveFrame || (await toBackground({ type: 'save:pending' })) !== true) return

    saveFrame = document.createElement('iframe')
    greet(saveFrame)
    saveFrame.src = `${FRAME_URL}#save`
    saveFrame.title = 'Montara Pass: save this login'
    // Out of sight until the prompt reports a height: it has nothing to show
    // for a login the vault already has. Transparent rather than empty: a
    // browser does not lay out a frame without area, which would then never
    // report one.
    saveFrame.style.cssText =
      'top: 16px; right: 16px; width: min(340px, calc(100vw - 32px)); height: 120px; opacity: 0; pointer-events: none'
    shadow.append(saveFrame)
    raise()
  }

  const closeSave = () => {
    saveFrame?.remove()
    saveFrame = null
    release()
  }

  const offerShown = () => !!offerFrame && offerFrame.style.opacity === '1'

  /**
   * Frame the logins the vault has for this site, if the page asks for one:
   * it has a password field that is not choosing a new password, or a field
   * that says it takes a username. Any other email box is not a sign-in.
   */
  // ponytail: looked for when the page arrives and once more a little later,
  // for forms a script draws. A sign-in a single-page app brings up after
  // that is not noticed here; the menu under its field still offers the same.
  const offerLogins = () => {
    if (offered || saveFrame) return

    const asks = Array.from(document.querySelectorAll('input'))
      .filter(usable)
      .some((el) =>
        el.type === 'password'
          ? !isNewPassword(el)
          : ['text', 'email', 'tel'].includes(el.type) && /username/i.test(el.autocomplete)
      )
    if (!asks) return
    offered = true

    offerFrame = document.createElement('iframe')
    greet(offerFrame)
    offerFrame.src = `${FRAME_URL}#offer`
    offerFrame.title = 'Montara Pass: logins for this site'
    // Out of sight until it reports a height, as the save prompt is: locked,
    // signed out or with no login for the site, it has nothing to show.
    offerFrame.style.cssText =
      'top: 16px; right: 16px; width: min(340px, calc(100vw - 32px)); height: 120px; opacity: 0; pointer-events: none'
    shadow.append(offerFrame)
    raise()
  }

  const closeOffer = () => {
    offerFrame?.remove()
    offerFrame = null
    release()
  }

  /**
   * Answer the page's request for a passkey, if one is waiting, and take the
   * prompt away. An empty answer leaves the request to the browser.
   */
  const closePasskey = (answer: object = {}) => {
    clearTimeout(passkeyTimer)
    if (passkey) {
      window.postMessage({ montaraPass: 'passkey:answer', id: passkey.id, ...answer }, ORIGIN)
    }
    passkey = null
    passkeyFrame?.remove()
    passkeyFrame = null
    release()
  }

  /** A message from src/passkey-page.ts, which anything in the page can send as well. */
  const onPageMessage = async (message: {
    montaraPass?: unknown
    id?: unknown
    kind?: unknown
  }) => {
    if (typeof message.id !== 'string') return

    if (message.montaraPass === 'passkey:cancel' && passkey?.id === message.id) {
      // The page no longer waits for an answer.
      passkey = null
      closePasskey()
    }
    if (message.montaraPass !== 'passkey:ask') return

    const request = { ...message, id: message.id }
    // Whether a site can keep a passkey here at all, rather than a request for one.
    const asking = message.kind === 'available'
    if (!asking) {
      // One at a time: an older request goes to the browser.
      closePasskey()
      passkey = request
    }

    let available = false
    try {
      available = (await chrome.runtime.sendMessage({ type: 'passkey:available' })) === true
    } catch {
      // The extension was updated or removed under a page that is still open.
    }

    if (asking) {
      window.postMessage({ montaraPass: 'passkey:answer', id: request.id, available }, ORIGIN)
      return
    }
    // Called off, or replaced, in the meantime.
    if (passkey !== request) return
    // Nobody is signed in: there is no vault to keep a passkey in.
    if (!available) return closePasskey()

    passkeyFrame = document.createElement('iframe')
    greet(passkeyFrame)
    passkeyFrame.src = `${FRAME_URL}#passkey`
    passkeyFrame.title = 'Montara Pass: passkey'
    // Out of sight until the prompt reports a height, as the save prompt is:
    // it has nothing to show for a site the vault holds no passkey for. On
    // the left, clear of the save prompt.
    passkeyFrame.style.cssText =
      'top: 16px; left: 16px; width: min(340px, calc(100vw - 32px)); height: 120px; opacity: 0; pointer-events: none'
    shadow.append(passkeyFrame)
    raise()
    // A prompt that does not come up, because the vault is slow to load or
    // the frame never did, must not leave the page waiting.
    passkeyTimer = window.setTimeout(closePasskey, 5000)
  }

  /**
   * Pass on the login in the page's form, if it holds one. Called when the
   * form looks like it is being sent.
   */
  // ponytail: any button press on a page with a filled password field counts
  // as sending it, so a sign-up the site then refuses is offered too. Telling
  // them apart means watching the response; add it if the prompt gets noisy.
  const capture = () => {
    const inputs = Array.from(document.querySelectorAll('input')).filter(usable)
    const passwords = inputs.filter((el) => el.type === 'password' && el.value)
    if (passwords.length === 0) return

    // Signing in by hand: the logins on offer are no longer wanted, and the
    // corner is free for the prompt that asks to save this one.
    closeOffer()

    // A sign-up asks for the password twice and a change of password asks for
    // the old one first: the last field holds the one that counts.
    const password = passwords[passwords.length - 1]
    const first = passwords[0]
    const scope = first.form ? inputs.filter((el) => el.form === first.form) : inputs
    const before = scope
      .slice(0, scope.indexOf(first))
      .filter((el) => ['text', 'email', 'tel'].includes(el.type) && el.value)
      .reverse()
    // The email or username, rather than whatever name field is closest.
    const username =
      before.find((el) => el.type === 'email' || /username|email/.test(el.autocomplete)) ??
      before[0]

    void toBackground({
      type: 'save:capture',
      username: username?.value ?? '',
      password: password.value,
    })

    // A page that loads another one is asked about there. One that only
    // swaps the form out is asked once the form is gone.
    clearInterval(watch)
    let ticks = 0
    watch = window.setInterval(() => {
      if (!password.isConnected || !usable(password)) {
        clearInterval(watch)
        void offerSave()
      } else if (++ticks >= 20) {
        clearInterval(watch)
      }
    }, 500)
  }

  document.addEventListener('submit', (e) => e.isTrusted && capture(), true)
  document.addEventListener(
    'click',
    (e) => {
      const pressed =
        e.target instanceof Element &&
        e.target.closest('button, input[type="submit"], [role="button"]')
      if (e.isTrusted && pressed) capture()
    },
    true
  )

  // The badge must not take the focus from the field it belongs to.
  badge.addEventListener('mousedown', (e) => e.preventDefault())
  badge.addEventListener('click', () => {
    // An unasked menu that has nothing to show yet makes way for a real one.
    if (frame && frame.style.opacity !== '0') return close()
    close()
    open()
  })

  document.addEventListener(
    'focusin',
    (e) => {
      if (isLoginField(e.target)) show(e.target)
    },
    true
  )

  document.addEventListener(
    'focusout',
    () => {
      // Once the focus has settled. Inside the menu it keeps the badge, since
      // using the menu is what moved it there.
      setTimeout(() => {
        if (document.activeElement !== field && document.activeElement !== host) hide()
      })
    },
    true
  )

  document.addEventListener(
    'mousedown',
    (e) => {
      if (frame && e.target !== host && e.target !== field) hide()
    },
    true
  )

  document.addEventListener(
    'keydown',
    (e) => {
      // A page can dispatch key events of its own.
      if (!e.isTrusted) return
      if (e.key === 'Enter' && e.target instanceof HTMLInputElement) capture()
      if (e.key === 'Escape' && frame) {
        dismissed = true
        close()
      }
      if (e.key === 'Escape' && offerShown()) closeOffer()
      if (e.key === 'ArrowDown' && e.altKey && field && e.target === field) {
        e.preventDefault()
        close()
        open()
        frame?.addEventListener('load', () => frame?.focus(), { once: true })
      }
    },
    true
  )

  // Typing a login by hand: the menu would only be in the way.
  document.addEventListener('input', (e) => e.isTrusted && e.target === field && close(), true)

  window.addEventListener('scroll', place, { capture: true, passive: true })
  window.addEventListener('resize', place)

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return

    // Only the frames made here are heard, each on its own channel: a copy
    // the page hid under something else would otherwise have its click
    // vouched for by the one in plain sight.
    const channel = String(message?.type).split(':')[0]
    const speaker =
      channel === 'inline'
        ? frame
        : channel === 'save'
          ? saveFrame
          : channel === 'passkey'
            ? passkeyFrame
            : channel === 'offer'
              ? offerFrame
              : null
    if (!speaker || typeof message.token !== 'string' || tokens.get(speaker) !== message.token) {
      return
    }

    switch (message?.type) {
      case 'inline:check':
        sendResponse(isVisible(frame))
        break
      // Asked again here: the login may have run out under an open prompt.
      case 'save:check':
        void toBackground({ type: 'save:pending' }).then((pending) =>
          sendResponse(pending === true && isVisible(saveFrame))
        )
        // The answer comes later.
        return true
      case 'save:resize':
        if (saveFrame && message.height > 0) {
          saveFrame.style.height = `${clamp(Number(message.height), 40, window.innerHeight - 32)}px`
          saveFrame.style.opacity = '1'
          saveFrame.style.pointerEvents = 'auto'
        }
        break
      case 'save:close':
        closeSave()
        break
      case 'offer:check':
        sendResponse(isVisible(offerFrame))
        break
      case 'offer:resize':
        if (offerFrame && message.height > 0) {
          offerFrame.style.height = `${clamp(Number(message.height), 40, Math.min(MAX_HEIGHT, window.innerHeight - 32))}px`
          offerFrame.style.opacity = '1'
          offerFrame.style.pointerEvents = 'auto'
          // The same logins, opened unasked under the field, would say it twice.
          if (frame?.src.split('#')[1]?.includes('auto')) close()
        }
        break
      case 'offer:close':
        closeOffer()
        break
      case 'passkey:request':
        sendResponse(passkey)
        break
      case 'passkey:check':
        sendResponse(isVisible(passkeyFrame))
        break
      case 'passkey:resize':
        if (passkeyFrame && message.height > 0) {
          // On screen: from here on the user is the one to answer.
          clearTimeout(passkeyTimer)
          passkeyFrame.style.height = `${clamp(Number(message.height), 40, window.innerHeight - 32)}px`
          passkeyFrame.style.opacity = '1'
          passkeyFrame.style.pointerEvents = 'auto'
        }
        break
      // The prompt's answer: a credential, an error, or nothing to offer.
      case 'passkey:done':
        if (passkey?.id === message.id) closePasskey(message.answer)
        break
      case 'inline:resize':
        frameHeight = clamp(Number(message.height) || 0, 40, MAX_HEIGHT)
        place()
        break
      case 'inline:show':
        if (frame) frame.style.opacity = frame.style.pointerEvents = ''
        break
      // Nothing to offer after all: the badge stays for whoever wants to look.
      case 'inline:quiet':
        close()
        if (document.activeElement !== field) hide()
        break
      case 'inline:close': {
        const last = field
        dismissed = true
        hide()
        if (message.refocus) last?.focus()
        break
      }
    }
  })

  // A field that already has the focus when the script arrives.
  if (isLoginField(document.activeElement)) show(document.activeElement)

  // A login submitted on the page before this one. Asked about first: the
  // logins for the site are not offered over it.
  void offerSave().then(() => {
    offerLogins()
    setTimeout(offerLogins, 1500)
  })

  // A page without an origin of its own has no passkeys either.
  if (ORIGIN !== 'null') {
    window.addEventListener('message', (e) => {
      if (e.source === window && typeof e.data === 'object' && e.data !== null) {
        void onPageMessage(e.data)
      }
    })
    // src/passkey-page.ts holds its requests until it hears this.
    window.postMessage({ montaraPass: 'passkey:ready' }, ORIGIN)
  }
})()
