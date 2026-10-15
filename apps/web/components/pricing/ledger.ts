/**
 * What the server can read, and what it cannot.
 *
 * The one demonstration only this product can make: the hosted server holds
 * ciphertext and wrapped keys, so it can neither read, search nor sort a vault.
 * Every row is a fact about the shipped architecture — see the Vault section of
 * `README.md` and `apps/docs/content/docs/architecture/encryption`.
 */

/**
 * The three states the column exists to contrast: `plain` is what the server
 * necessarily knows, `cipher` is what it holds but cannot read, and `never` is
 * what does not leave the device at all.
 */
export type LedgerState = "plain" | "cipher" | "never";

export const LEDGER_LABEL: Record<LedgerState, string> = {
  plain: "plaintext",
  cipher: "ciphertext",
  never: "never sent",
};

/** A field, which of the three states it is in, and its label where the state's own word is not the right one. */
export const LEDGER: { field: string; state: LedgerState; label?: string }[] = [
  { field: "account email", state: "plain" },
  { field: "item type", state: "plain" },
  { field: "who an item is shared with", state: "plain" },
  { field: "login, password, url, notes", state: "cipher" },
  { field: "folder names", state: "cipher" },
  { field: "passkeys (es256)", state: "cipher" },
  // The vault key is the one thing the server holds that is not a ciphertext to
  // it: it is a key, wrapped under a key it does not have.
  { field: "vault key", state: "cipher", label: "wrapped" },
  { field: "master password", state: "never" },
];
