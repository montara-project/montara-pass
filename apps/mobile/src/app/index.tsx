import { Ionicons } from '@expo/vector-icons'
import { passwordHealth } from '@montara-pass/shared/password'
import { LinearGradient } from 'expo-linear-gradient'
import { Redirect, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AuthShell } from '@/components/vault/auth-shell'
import { CategoryCard } from '@/components/vault/category-card'
import { GradientButton } from '@/components/vault/gradient-button'
import { HealthGauge } from '@/components/vault/health-gauge'
import { IconButton } from '@/components/vault/icon-button'
import { SearchBar } from '@/components/vault/search-bar'
import { VaultItemRow } from '@/components/vault/vault-item-row'
import { colors, font } from '@/constants/theme'
import { useVaultItems } from '@/hooks/use-vault-items'
import {
  getProfile,
  getUserKeys,
  setItemPlacement,
  signOut,
  SignedOutError,
  toMessage,
} from '@/lib/api'
import { APP_URL, getTokens } from '@/lib/storage'
import { vaultStore } from '@/lib/vault-store'

type Stage = 'loading' | 'signed-out' | 'locked' | 'no-vault' | 'error' | 'ready'

export default function Home() {
  const insets = useSafeAreaInsets()
  const keys = useSyncExternalStore(vaultStore.subscribe, vaultStore.get, vaultStore.get)
  const [stage, setStage] = useState<Stage>('loading')
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const { items, error: itemsError, load } = useVaultItems(stage === 'ready' ? keys : null)

  const resolve = useCallback(async () => {
    setStage('loading')
    setError('')

    try {
      if (!(await getTokens())) {
        setStage('signed-out')
        return
      }
      if (vaultStore.get()) {
        setStage('ready')
        // Only decorates the greeting, so a failure here is not worth reporting.
        void getProfile()
          .then((profile) => setName(profile.user.name))
          .catch(() => undefined)
        return
      }
      const userKeys = await getUserKeys()
      setStage(userKeys ? 'locked' : 'no-vault')
    } catch (err) {
      if (err instanceof SignedOutError) {
        setStage('signed-out')
        return
      }
      setError(toMessage(err, 'Something went wrong'))
      setStage('error')
    }
  }, [])

  useEffect(() => {
    void resolve()
  }, [resolve])

  // Logins with a weak or reused password, counted once each.
  const healthPercent = useMemo(() => {
    const health = passwordHealth(items ?? [])
    if (health.checked === 0) return 100
    const problem = new Set<string>()
    for (const item of health.weak) problem.add(item.id)
    for (const group of health.reused) {
      for (const item of group) problem.add(item.id)
    }
    return Math.max(0, Math.round(((health.checked - problem.size) / health.checked) * 100))
  }, [items])

  const categories = useMemo(() => {
    const by: Record<string, number> = {}
    for (const item of items ?? []) {
      by[item.type] = (by[item.type] ?? 0) + 1
    }
    return [
      { count: by.login ?? 0, icon: 'globe-outline', label: 'Logins' },
      { count: by.secure_note ?? 0, icon: 'document-text-outline', label: 'Notes' },
      { count: by.card ?? 0, icon: 'card-outline', label: 'Cards' },
    ] as const
  }, [items])

  const recent = useMemo(
    () =>
      [...(items ?? [])]
        .sort((a, b) =>
          (b.last_used_at ?? b.updated_at).localeCompare(a.last_used_at ?? a.updated_at)
        )
        .slice(0, 2),
    [items]
  )

  if (stage === 'signed-out') return <Redirect href="/sign-in" />
  if (stage === 'locked' || (stage === 'ready' && !keys)) return <Redirect href="/unlock" />

  if (stage === 'loading') {
    return (
      <AuthShell>
        <Text style={styles.muted}>Loading…</Text>
      </AuthShell>
    )
  }

  if (stage === 'error') {
    return (
      <AuthShell>
        <Text style={styles.heading}>Something went wrong</Text>
        <Text style={styles.muted}>{error}</Text>
        <GradientButton label="Try again" onPress={() => void resolve()} />
      </AuthShell>
    )
  }

  if (stage === 'no-vault') {
    return (
      <AuthShell>
        <Text style={styles.heading}>No vault yet</Text>
        <Text style={styles.muted}>
          Create your vault and its master password in the web app, then come back here.
        </Text>
        <GradientButton
          label="Open Montara Pass"
          onPress={() => void WebBrowser.openBrowserAsync(APP_URL)}
        />
        <Pressable hitSlop={8} onPress={() => void signOut().then(() => setStage('signed-out'))}>
          <Text style={styles.link}>Sign out</Text>
        </Pressable>
      </AuthShell>
    )
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.heroTop, colors.heroBottom]}
          end={{ x: 0.5, y: 1 }}
          start={{ x: 0.2, y: 0 }}
          style={[styles.hero, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.greetingRow}>
            <View style={styles.greetingText}>
              <Text style={styles.greeting}>Hello {name || 'there'} 👋</Text>
              <Text style={styles.greetingSub}>Welcome back again!</Text>
            </View>
            <IconButton icon="notifications-outline" />
          </View>
          <View style={styles.gaugeWrap}>
            <HealthGauge percent={healthPercent} />
          </View>
        </LinearGradient>
        <View style={styles.sheet}>
          <SearchBar placeholder="Search your vaults" />
          <View style={styles.categories}>
            {categories.map((category) => (
              <CategoryCard
                key={category.label}
                {...category}
                onPress={() => router.push('/vault')}
              />
            ))}
          </View>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recently Used</Text>
            <Pressable hitSlop={8} onPress={() => router.push('/vault')}>
              <Text style={styles.seeMore}>See More</Text>
            </Pressable>
          </View>
          {itemsError ? <Text style={styles.itemsError}>{itemsError}</Text> : null}
          <View style={styles.recent}>
            {recent.map((item) => (
              <VaultItemRow
                key={item.id}
                item={item}
                onToggleFavorite={(favorite) =>
                  void setItemPlacement(item.id, { folder_id: item.folder_id, favorite }).then(() =>
                    load()
                  )
                }
              />
            ))}
          </View>
        </View>
      </ScrollView>
      <Pressable
        onPress={() => router.push('/new-vault')}
        style={[styles.fab, { bottom: insets.bottom + 22 }]}
      >
        <LinearGradient colors={[colors.pink, colors.coral]} style={styles.fabGradient}>
          <Ionicons color="#FFFFFF" name="add" size={28} />
        </LinearGradient>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  categories: {
    flexDirection: 'row',
    gap: 12,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 110,
  },
  fab: {
    height: 62,
    position: 'absolute',
    right: 22,
    width: 62,
  },
  fabGradient: {
    alignItems: 'center',
    borderRadius: 999,
    elevation: 6,
    flex: 1,
    shadowColor: colors.pink,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  gaugeWrap: {
    alignSelf: 'center',
    marginTop: 26,
  },
  greeting: {
    color: '#FFFFFF',
    fontFamily: font.extraBold,
    fontSize: 26,
  },
  greetingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  greetingSub: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: font.regular,
    fontSize: 14,
    marginTop: 2,
  },
  greetingText: {
    gap: 2,
  },
  heading: {
    color: colors.navy,
    fontFamily: font.extraBold,
    fontSize: 24,
  },
  hero: {
    paddingBottom: 100,
  },
  itemsError: {
    color: '#E5484D',
    fontFamily: font.semiBold,
    fontSize: 13,
  },
  link: {
    color: colors.pink,
    fontFamily: font.semiBold,
    fontSize: 13,
    textAlign: 'center',
  },
  muted: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 14,
  },
  recent: {
    gap: 12,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionTitle: {
    color: colors.navy,
    fontFamily: font.extraBold,
    fontSize: 17,
  },
  seeMore: {
    color: colors.pink,
    fontFamily: font.semiBold,
    fontSize: 13,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    gap: 18,
    marginTop: -34,
    paddingHorizontal: 20,
    paddingTop: 26,
  },
})
