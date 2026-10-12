/**
 * Fill the new-password fields of a sign-up form. Serialized and run inside
 * the page like fillLogin, so it is self-contained too.
 *
 * @returns how many fields were filled
 */
export function fillNewPassword(password: string): number {
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

  const passwords = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[type="password"]')
  ).filter((el) => usable(el) && el.autocomplete !== 'current-password')
  const marked = passwords.filter((el) => el.autocomplete === 'new-password')
  // The password and its confirmation. Three unmarked fields are a change of
  // password, which asks for the old one first.
  // ponytail: by position; a page with a sign-in and a sign-up form side by
  // side gets both filled. Fill only the focused field's form if that shows up.
  const targets = marked.length > 0 ? marked : passwords.slice(passwords.length > 2 ? 1 : 0)

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  for (const el of targets) {
    setter?.call(el, password)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
  return targets.length
}

/**
 * Fill the login form of the current page. This function is serialized and
 * run inside the page by chrome.scripting, so it must stay self-contained:
 * no imports and no outer variables.
 *
 * @returns what was filled, so the popup can say so
 */
export function fillLogin(
  username: string,
  password: string
): { username: boolean; password: boolean } {
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

  // Frameworks keep their own copy of an input's value; assigning through the
  // native setter and dispatching the events makes them notice the change.
  const setValue = (el: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const inputs = Array.from(document.querySelectorAll('input')).filter(usable)
  const passwordField = inputs.find((el) => el.type === 'password')

  // The username is the closest text-like field before the password, in the
  // same form when there is one. A page that asks for the username alone
  // (password on the next step) gets its first such field filled.
  const isUsernameLike = (el: HTMLInputElement) =>
    ['text', 'email', 'tel'].includes(el.type) || el.autocomplete === 'username'
  const scope = passwordField?.form ? inputs.filter((el) => el.form === passwordField.form) : inputs
  const before = passwordField ? scope.slice(0, scope.indexOf(passwordField)) : scope
  const candidates = before.filter(isUsernameLike)
  const usernameField = passwordField ? candidates[candidates.length - 1] : candidates[0]

  const filled = { username: false, password: false }
  if (usernameField && username) {
    setValue(usernameField, username)
    filled.username = true
  }
  if (passwordField && password) {
    setValue(passwordField, password)
    filled.password = true
  }
  return filled
}
