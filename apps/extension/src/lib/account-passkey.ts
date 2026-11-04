import type { Models } from '@montara-pass/shared/api/models'

import { getPasskey } from '@montara-pass/shared/auth/passkey'
import {
  unlockVaultMaterialWithPasskey,
  WrongPasskeyError,
  type VaultMaterial,
} from '@montara-pass/shared/crypto/vault'

import { getUserKeys, passkeyOptions, passkeySignIn } from './api'
import { storeVault } from './session'

// The passkey on the Montara Pass account, as the popup uses it: to sign in,
// and to unlock the vault where the passkey seals the vault key (PRF). Not
// the passkeys kept in the vault for other sites (./passkey.ts). The popup
// asks the browser itself: an extension may use the RP ID of a host it has
// permission for (Chrome 122, Firefox 150), and the server accepts the
// extension's origin.

/**
 * Sign in with a passkey, and unlock the vault too when the passkey can.
 * Throws a DOMException NotAllowedError when the user dismisses the prompt.
 */
export async function signInWithPasskey(): Promise<void> {
  const { ceremony, options } = await passkeyOptions()
  const result = await getPasskey(options)
  const passkey = await passkeySignIn(ceremony, result.credential)

  if (!result.prf || !passkey.encrypted_vault_key) return
  try {
    const keys = await getUserKeys()
    if (keys) {
      await storeVault(
        await unlockVaultMaterialWithPasskey(result.prf, passkey.encrypted_vault_key, keys)
      )
    }
  } catch {
    // Signed in all the same: the master password still opens the vault.
  }
}

/**
 * Unlock the vault with one of the passkeys that seal its key. Throws
 * WrongPasskeyError when the chosen one cannot open it.
 */
export async function unlockWithPasskey(
  userKeys: Models.UserKeys,
  passkeys: Models.AccountPasskey[]
): Promise<VaultMaterial> {
  const usable = passkeys.filter((p) => p.encrypted_vault_key)
  // The sign-in options carry the RP ID and a fresh challenge; the ceremony
  // is never finished, only the PRF output is wanted.
  const { options } = await passkeyOptions()
  const result = await getPasskey(
    options,
    usable.map((p) => p.credential_id)
  )
  const passkey = usable.find((p) => p.credential_id === result.credentialId)
  if (!passkey?.encrypted_vault_key || !result.prf) throw new WrongPasskeyError()
  return unlockVaultMaterialWithPasskey(result.prf, passkey.encrypted_vault_key, userKeys)
}
