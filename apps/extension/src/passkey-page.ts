// The page's side of passkeys. The manifest runs it in the page's own world,
// in the top frame, before any script of the page, and it stands in for
// navigator.credentials. A request for a passkey goes to src/content.ts, which
// frames the prompt (inline.html#passkey). The answer is a credential, an
// error, or word that Montara Pass has nothing to offer: the browser's own
// navigator.credentials then takes the request as if this were not here.
//
// Nothing here is trusted or secret, since the page can read and rewrite all
// of it. What is signed, and for which site, is decided in the prompt
// (src/lib/passkey.ts). Like the content script it imports nothing.
// Keep the message names in sync with src/content.ts.

;(() => {
  const container = navigator.credentials
  // Not location.origin: a sandboxed page has an address, but no origin.
  const origin = window.origin
  // Neither is there on a page served over plain http.
  if (!container || !window.PublicKeyCredential || origin === 'null') return

  /** A credential as src/lib/passkey.ts answers it: WebAuthn's JSON form. */
  interface CredentialJSON {
    id: string
    rawId: string
    type: string
    authenticatorAttachment: string
    clientExtensionResults: object
    response: {
      clientDataJSON: string
      authenticatorData: string
      attestationObject?: string
      publicKey?: string
      publicKeyAlgorithm?: number
      transports?: string[]
      signature?: string
      userHandle?: string
    }
  }

  /** Empty when Montara Pass leaves the request to the browser. */
  interface Answer {
    credential?: CredentialJSON
    /** The name of the DOMException the request ends in. */
    error?: string
    available?: boolean
  }

  const waiting = new Map<string, (answer: Answer) => void>()

  // The content script arrives once the page has loaded. A request made
  // before that waits for it; one made on a page it never came to does not.
  let attached!: (value: boolean) => void
  const ready = new Promise<boolean>((resolve) => (attached = resolve))
  const giveUp = () => setTimeout(attached, 1500, false)
  if (document.readyState === 'complete') giveUp()
  else window.addEventListener('load', giveUp)

  window.addEventListener('message', (e) => {
    if (e.source !== window || typeof e.data !== 'object' || e.data === null) return

    if (e.data.montaraPass === 'passkey:ready') attached(true)
    if (e.data.montaraPass === 'passkey:answer') {
      waiting.get(e.data.id)?.(e.data)
      waiting.delete(e.data.id)
    }
  })

  const ask = async (body: object, signal?: AbortSignal | null): Promise<Answer> => {
    if (!(await ready)) return {}
    signal?.throwIfAborted()

    const id = crypto.randomUUID()
    return new Promise((resolve, reject) => {
      waiting.set(id, resolve)
      // A page drops the request it made for the autofill menu when a button
      // asks for a passkey outright.
      signal?.addEventListener(
        'abort',
        () => {
          waiting.delete(id)
          window.postMessage({ montaraPass: 'passkey:cancel', id }, origin)
          reject(signal.reason)
        },
        { once: true }
      )
      window.postMessage({ montaraPass: 'passkey:ask', id, ...body }, origin)
    })
  }

  // Bytes travel as base64url: a message to the extension is JSON.
  const encode = (source: BufferSource) => {
    const bytes = ArrayBuffer.isView(source)
      ? new Uint8Array(source.buffer, source.byteOffset, source.byteLength)
      : new Uint8Array(source)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  const decode = (value: string) =>
    Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0))
      .buffer

  type Options = CredentialCreationOptions | CredentialRequestOptions
  /** Both kinds of request may ask for the autofill menu; only one is typed to. */
  const mediation = (options: Options) => (options as CredentialRequestOptions).mediation

  /** The request, as src/lib/passkey.ts reads it. */
  const describe = (kind: 'create' | 'get', options: Options) => {
    if (kind === 'create') {
      const publicKey = (options as CredentialCreationOptions).publicKey!
      return {
        kind,
        challenge: encode(publicKey.challenge),
        rpId: publicKey.rp.id,
        user: { id: encode(publicKey.user.id), name: publicKey.user.name },
        algs: publicKey.pubKeyCredParams.map((param) => param.alg),
        ids: (publicKey.excludeCredentials ?? []).map((credential) => encode(credential.id)),
        credProps: publicKey.extensions?.credProps === true,
      }
    }

    const publicKey = (options as CredentialRequestOptions).publicKey!
    return {
      kind,
      conditional: mediation(options) === 'conditional',
      challenge: encode(publicKey.challenge),
      rpId: publicKey.rpId,
      ids: (publicKey.allowCredentials ?? []).map((credential) => encode(credential.id)),
    }
  }

  /**
   * The object a page expects from navigator.credentials. The prototypes are
   * the browser's, for a page that checks what it was handed.
   */
  const build = (json: CredentialJSON): Credential => {
    const from = json.response
    const clientDataJSON = decode(from.clientDataJSON)
    const authenticatorData = decode(from.authenticatorData)

    const response =
      from.attestationObject !== undefined
        ? Object.setPrototypeOf(
            {
              clientDataJSON,
              attestationObject: decode(from.attestationObject),
              getAuthenticatorData: () => authenticatorData,
              getPublicKey: () => decode(from.publicKey ?? ''),
              getPublicKeyAlgorithm: () => from.publicKeyAlgorithm,
              getTransports: () => from.transports ?? [],
            },
            AuthenticatorAttestationResponse.prototype
          )
        : Object.setPrototypeOf(
            {
              clientDataJSON,
              authenticatorData,
              signature: decode(from.signature ?? ''),
              userHandle: decode(from.userHandle ?? ''),
            },
            AuthenticatorAssertionResponse.prototype
          )

    return Object.setPrototypeOf(
      {
        id: json.id,
        rawId: decode(json.rawId),
        type: json.type,
        authenticatorAttachment: json.authenticatorAttachment,
        response,
        getClientExtensionResults: () => json.clientExtensionResults,
        toJSON: () => json,
      },
      PublicKeyCredential.prototype
    )
  }

  const take = async <T extends Options>(
    kind: 'create' | 'get',
    options: T | undefined,
    browser: (options?: T) => Promise<Credential | null>
  ): Promise<Credential | null> => {
    let body: object
    try {
      // Not a passkey, or already called off.
      if (!options?.publicKey || options.signal?.aborted) return browser(options)
      // A passkey made without asking, after a password sign-in, or a
      // sign-in that must not ask.
      if (mediation(options) === 'silent') return browser(options)
      if (kind === 'create' && mediation(options) === 'conditional') return browser(options)
      // A security key was asked for by name, and this is not one.
      const wanted = (options as CredentialCreationOptions).publicKey?.authenticatorSelection
      if (wanted?.authenticatorAttachment === 'cross-platform') return browser(options)
      body = describe(kind, options)
    } catch {
      // Not a request that makes sense: the browser is the one to say so.
      return browser(options)
    }

    const answer = await ask(body, options.signal)
    if (answer.credential) return build(answer.credential)
    if (answer.error) {
      throw new DOMException('The operation either timed out or was not allowed.', answer.error)
    }
    return browser(options)
  }

  const create = container.create.bind(container)
  const get = container.get.bind(container)
  container.create = (options) => take('create', options, create)
  container.get = (options) => take('get', options, get)

  // A site offers passkeys only where it believes one can be kept. With
  // Montara Pass signed in one can, whatever the computer is.
  const builtIn =
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.bind(PublicKeyCredential)
  PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = async () =>
    (await builtIn?.().catch(() => false)) || (await ask({ kind: 'available' })).available === true
})()
