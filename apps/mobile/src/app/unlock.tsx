import { unlockVaultMaterial, WrongMasterPasswordError } from '@montara-pass/shared/crypto/vault'
import { initials } from '@montara-pass/shared/string'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { AuthShell } from '@/components/vault/auth-shell'
import { Field } from '@/components/vault/field'
import { GradientButton } from '@/components/vault/gradient-button'
import { colors, font } from '@/constants/theme'
import { getProfile, getUserKeys, signOut, toMessage } from '@/lib/api'
import { vaultStore } from '@/lib/vault-store'

const AUTO_LOCK_MINUTES = 15

export default function Unlock() {
  const [masterPassword, setMasterPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    // Only says whose vault this is, so a failure here is not worth reporting.
    void getProfile()
      .then((profile) => setEmail(profile.user.email))
      .catch(() => undefined)
  }, [])

  const submit = async () => {
    if (busy) return
    setBusy(true)
    setError('')

    try {
      const userKeys = await getUserKeys()
      if (!userKeys) {
        setError('No vault yet — create one in the web app first.')
        return
      }
      // The master password is used here and nowhere else: it is not stored
      // and not sent anywhere. Taken as typed: a space is part of it.
      const material = await unlockVaultMaterial(masterPassword, userKeys)
      await vaultStore.unlock(material)
      router.replace('/')
    } catch (err) {
      setError(
        err instanceof WrongMasterPasswordError
          ? err.message
          : toMessage(err, 'The vault could not be unlocked.')
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <StatusBar style="light" />
      <AuthShell>
        <Text style={styles.heading}>Unlock your vault</Text>
        <Field
          label="Master password"
          secure
          value={masterPassword}
          onChangeValue={setMasterPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <GradientButton busy={busy} label="Unlock Montara Pass" onPress={() => void submit()} />
        <Text style={styles.note}>
          Locks again after {AUTO_LOCK_MINUTES} minutes without use, and when the app closes.
        </Text>
        <View style={styles.foot}>
          {email ? (
            <View style={styles.account}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(email)}</Text>
              </View>
              <Text style={styles.email} numberOfLines={1}>
                {email}
              </Text>
            </View>
          ) : null}
          <Pressable
            hitSlop={8}
            onPress={() => void signOut().then(() => router.replace('/sign-in'))}
          >
            <Text style={styles.switchLink}>Switch account</Text>
          </Pressable>
        </View>
      </AuthShell>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  account: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.pinkSoft,
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: {
    color: colors.pink,
    fontFamily: font.bold,
    fontSize: 13,
  },
  content: {
    flexGrow: 1,
  },
  email: {
    color: colors.navy,
    fontFamily: font.semiBold,
    fontSize: 13,
  },
  error: {
    color: '#E5484D',
    fontFamily: font.semiBold,
    fontSize: 13,
  },
  foot: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  heading: {
    color: colors.navy,
    fontFamily: font.extraBold,
    fontSize: 24,
  },
  note: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 13,
    marginTop: -6,
  },
  switchLink: {
    color: colors.pink,
    fontFamily: font.semiBold,
    fontSize: 13,
  },
})
