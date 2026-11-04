import type { Models } from '@montara-pass/shared/api/models'

import { createPasskey, getPasskey } from '@montara-pass/shared/auth/passkey'
import {
  sealVaultKeyForPasskey,
  unlockVaultWithPasskey,
  vaultKeyForPasskey,
  WrongPasskeyError,
  type VaultKeys,
} from '@montara-pass/shared/crypto/vault'

import { getQueryClient } from '@/lib/providers/react-query'

import { throwApiError } from '../api/api-error'
import { queries } from '../api/queries'
import { services } from '../api/services'
import { useVaultStore } from '../stores/vault'
import { storeSignIn } from './email-auth'

/**
 * Sign in with a passkey. The passkey names the account, so nothing is
 * typed. Where it has PRF and seals the vault key, the vault is unlocked as
 * well; otherwise the vault gate asks for the master password as usual.
 * Throws a DOMException NotAllowedError when the user dismisses the prompt.
 */
export async function signInWithPasskey(): Promise<{ unlocked: boolean }> {
  let res: Models.PasskeySignInData
  let prf: Uint8Array<ArrayBuffer> | undefined
  try {
    const { ceremony, options } = await services.auth.passkeyOptions()
    const passkey = await getPasskey(options)
    prf = passkey.prf
    res = await services.auth.passkeySignIn({ ceremony, credential: passkey.credential })
  } catch (error) {
    if (error instanceof DOMException) throw error
    throwApiError(error)
  }
  storeSignIn(res)

  const sealed = res.passkey.encrypted_vault_key
  if (!prf || !sealed) return { unlocked: false }
  try {
    const keys = await getQueryClient().fetchQuery(queries.keys.get())
    if (!keys) return { unlocked: false }
    useVaultStore.getState().unlock(await unlockVaultWithPasskey(prf, sealed, keys))
    return { unlocked: true }
  } catch {
    // Signed in all the same: the master password still opens the vault.
    return { unlocked: false }
  }
}

/**
 * Unlock the vault with one of the user's passkeys that seal the vault key.
 * Throws WrongPasskeyError when the chosen one cannot open it.
 */
export async function unlockWithPasskey(
  userKeys: Models.UserKeys,
  passkeys: Models.AccountPasskey[]
): Promise<VaultKeys> {
  const usable = passkeys.filter((p) => p.encrypted_vault_key)
  // The sign-in options carry the RP ID and a fresh challenge; the ceremony
  // is never finished, only the PRF output is wanted.
  const { options } = await services.auth.passkeyOptions()
  const result = await getPasskey(
    options,
    usable.map((p) => p.credential_id)
  )
  const passkey = usable.find((p) => p.credential_id === result.credentialId)
  if (!passkey?.encrypted_vault_key || !result.prf) throw new WrongPasskeyError()
  return unlockVaultWithPasskey(result.prf, passkey.encrypted_vault_key, userKeys)
}

/**
 * Add a passkey to the account. The master password is checked first, before
 * the browser asks for a touch, and opens the vault key for the passkey to
 * seal; the account password guards the change on the server.
 */
export async function addPasskey(
  value: { name: string; password: string; masterPassword: string },
  userKeys: Models.UserKeys
): Promise<Models.AccountPasskey> {
  const vaultKey = await vaultKeyForPasskey(value.masterPassword, userKeys)
  const { ceremony, options } = (await services.passkeys.registerBegin(value.password)).data
  const result = await createPasskey(options)
  const encrypted_vault_key = result.prf
    ? await sealVaultKeyForPasskey(vaultKey, result.prf)
    : undefined
  return (
    await services.passkeys.registerFinish({
      ceremony,
      name: value.name,
      credential: result.credential,
      encrypted_vault_key,
    })
  ).data
}
