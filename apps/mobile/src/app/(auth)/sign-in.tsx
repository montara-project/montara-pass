import { Ionicons } from '@expo/vector-icons'
import { errorMessage } from '@montara-pass/shared/string'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

import { AuthShell } from '@/components/vault/auth-shell'
import { Field } from '@/components/vault/field'
import { GradientButton } from '@/components/vault/gradient-button'
import { colors, font } from '@/constants/theme'
import { signIn, verifyTotp } from '@/lib/api'
import { APP_URL } from '@/lib/storage'

export default function SignIn() {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <StatusBar style="light" />
      <AuthShell>
        <SignInForm />
      </AuthShell>
    </ScrollView>
  )
}

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Set when the account asks for a code from an authenticator app.
  const [totpToken, setTotpToken] = useState('')

  const submit = async () => {
    if (busy) return
    setBusy(true)
    setError('')

    try {
      // The password goes as typed: a space is part of it.
      const { totpToken } = await signIn(email.trim(), password)
      if (totpToken) {
        setTotpToken(totpToken)
        return
      }
      router.replace('/')
    } catch (err) {
      setError(errorMessage(err, 'Sign-in failed'))
    } finally {
      setBusy(false)
    }
  }

  if (totpToken) {
    return <TotpStep totpToken={totpToken} onBack={() => setTotpToken('')} />
  }

  return (
    <>
      <Text style={styles.heading}>Sign in</Text>
      <Text style={styles.note}>Sign in with your account password.</Text>
      <Field label="Email" value={email} onChangeValue={setEmail} />
      <Field label="Password" secure value={password} onChangeValue={setPassword} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <GradientButton busy={busy} label="Sign in" onPress={() => void submit()} />
      <Pressable
        hitSlop={8}
        onPress={() => void WebBrowser.openBrowserAsync(`${APP_URL}/forgot-password`)}
      >
        <Text style={styles.link}>Forgot your password?</Text>
      </Pressable>
      <Pressable hitSlop={8} onPress={() => void WebBrowser.openBrowserAsync(`${APP_URL}/sign-up`)}>
        <Text style={styles.link}>No account yet? Create one</Text>
      </Pressable>
    </>
  )
}

interface TotpStepProps {
  totpToken: string
  onBack: () => void
}

/** The second step of signing in, for an account that turned TOTP on. */
function TotpStep({ totpToken, onBack }: TotpStepProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // A backup code is longer than six digits and has letters: it gets a plain field.
  const [backup, setBackup] = useState(false)

  const submit = async () => {
    if (busy) return
    setBusy(true)
    setError('')

    try {
      await verifyTotp(totpToken, code.replace(/\s/g, ''))
      router.replace('/')
    } catch (err) {
      setError(errorMessage(err, 'Verification failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Text style={styles.heading}>Two-step verification</Text>
      <Text style={styles.note}>
        {backup
          ? 'Enter one of your backup codes. Each one works once.'
          : 'Enter the 6-digit code from your authenticator app.'}
      </Text>
      <Field label={backup ? 'Backup code' : 'Code'} value={code} onChangeValue={setCode} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <GradientButton busy={busy} label="Verify" onPress={() => void submit()} />
      <Pressable
        hitSlop={8}
        onPress={() => {
          setBackup((value) => !value)
          setError('')
          setCode('')
        }}
      >
        <Text style={styles.link}>{backup ? 'Use a code from the app' : 'Use a backup code'}</Text>
      </Pressable>
      <Pressable hitSlop={8} onPress={onBack} style={styles.backRow}>
        <Ionicons color={colors.pink} name="arrow-back" size={14} />
        <Text style={styles.link}> Back to sign in</Text>
      </Pressable>
    </>
  )
}

const styles = StyleSheet.create({
  backRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flexGrow: 1,
  },
  error: {
    color: '#E5484D',
    fontFamily: font.semiBold,
    fontSize: 13,
  },
  heading: {
    color: colors.navy,
    fontFamily: font.extraBold,
    fontSize: 24,
  },
  link: {
    color: colors.pink,
    fontFamily: font.semiBold,
    fontSize: 13,
    textAlign: 'center',
  },
  note: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 13,
    marginTop: -8,
  },
})
