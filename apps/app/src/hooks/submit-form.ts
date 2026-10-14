/**
 * Send a form, and put the focus on the first field it has something to say
 * about: an error under a field nobody is in goes unheard.
 */
export async function submitForm(
  el: HTMLFormElement,
  form: {
    handleSubmit: () => Promise<void>
    state: { fieldMeta: Record<string, { errors: unknown[] } | undefined> }
  }
): Promise<void> {
  await form.handleSubmit()

  const meta = form.state.fieldMeta
  const refused = Array.from(el.elements).find(
    (control) => meta[(control as HTMLInputElement).name]?.errors.length
  )
  if (refused instanceof HTMLElement) refused.focus()
}
