// The page side of the inline menu: a badge inside the focused login field and
// a frame under it that holds the menu (inline.html). The manifest runs it on
// every page, in the top frame only. It also notices a login being submitted
// and frames the prompt that offers to save it (inline.html#save).
//
// It never sees the vault: the frames are extension pages, which the page
// around them can neither read nor script, and the menu fills the form itself.
// A login the user typed into the page is passed on to the background script.
// Like the background script it imports nothing, so it stays a single file
// the manifest can name as a content script.
// Keep the message names in sync with src/inline/main.tsx.

;(() => {
  const FRAME_URL = chrome.runtime.getURL('inline.html')
  const BADGE = 24
  const MAX_HEIGHT = 320

  let field: HTMLInputElement | null = null
  let frame: HTMLIFrameElement | null = null
  let frameHeight = 56
  let saveFrame: HTMLIFrameElement | null = null
  let watch = 0

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
   * or anywhere on a page without forms. A field marked autocomplete=username
   * counts on its own, for sign-ins that ask for the password on a second step.
   */
  const isLoginField = (target: EventTarget | null): target is HTMLInputElement => {
    if (!(target instanceof HTMLInputElement) || !usable(target)) return false
    if (target.type === 'password') return true
    if (!['text', 'email', 'tel'].includes(target.type)) return false
    if (target.autocomplete === 'username') return true

    const scope: ParentNode = target.form ?? document
    return Array.from(scope.querySelectorAll<HTMLInputElement>('input[type="password"]')).some(
      usable
    )
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
  }

  const close = () => {
    frame?.remove()
    frame = null
    frameHeight = 56
  }

  const hide = () => {
    close()
    field = null
    badge.hidden = true
    // The save prompt lives in the same host and outlasts the field.
    if (!saveFrame) host.remove()
  }

  const open = () => {
    if (frame || !field) return

    frame = document.createElement('iframe')
    frame.src = FRAME_URL
    frame.title = 'Montara Pass'
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
    if (!field) host.remove()
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
  badge.addEventListener('click', () => (frame ? close() : open()))

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
      // Once the focus has settled: an open menu keeps the badge, since using
      // the menu is what moved the focus.
      setTimeout(() => {
        if (!frame && document.activeElement !== field) hide()
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
      if (e.key === 'Escape' && frame) close()
      if (e.key === 'ArrowDown' && e.altKey && field && e.target === field) {
        e.preventDefault()
        open()
        frame?.addEventListener('load', () => frame?.focus(), { once: true })
      }
    },
    true
  )

  window.addEventListener('scroll', place, { capture: true, passive: true })
  window.addEventListener('resize', place)

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return

    switch (message?.type) {
      case 'inline:check':
        sendResponse(isVisible(frame))
        break
      case 'save:check':
        sendResponse(isVisible(saveFrame))
        break
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
      case 'inline:resize':
        frameHeight = clamp(Number(message.height) || 0, 40, MAX_HEIGHT)
        place()
        break
      case 'inline:close': {
        const last = field
        hide()
        if (message.refocus) last?.focus()
        break
      }
    }
  })

  // A field that already has the focus when the script arrives.
  if (isLoginField(document.activeElement)) show(document.activeElement)

  // A login submitted on the page before this one.
  void offerSave()
})()
