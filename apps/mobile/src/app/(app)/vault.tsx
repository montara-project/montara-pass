import { matchesSearch } from '@montara-pass/shared/crypto/vault'
import { LinearGradient } from 'expo-linear-gradient'
import { Redirect, useRouter } from 'expo-router'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FilterChips } from '@/components/vault/filter-chips'
import { IconButton } from '@/components/vault/icon-button'
import { SearchBar } from '@/components/vault/search-bar'
import { VaultItemRow } from '@/components/vault/vault-item-row'
import { colors, font } from '@/constants/theme'
import { useVaultItems } from '@/hooks/use-vault-items'
import { setItemPlacement, toMessage, trashItem } from '@/lib/api'
import { getTokens } from '@/lib/storage'
import { vaultStore } from '@/lib/vault-store'

const filters = ['All', 'Recent', 'Favourite', 'Last Edit']

export default function MyVaults() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const keys = useSyncExternalStore(vaultStore.subscribe, vaultStore.get, vaultStore.get)
  const { items, error, load } = useVaultItems(keys)
  const [filter, setFilter] = useState(filters[0])
  const [query, setQuery] = useState('')
  const [banner, setBanner] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // The screen is only meaningful signed in; anything else goes back to the
  // stage that can get there. A locked vault goes to the unlock screen.
  useEffect(() => {
    void getTokens().then((tokens) => {
      if (!tokens) router.replace('/sign-in')
    })
  }, [router])

  const visible = useMemo(() => {
    let list = items ?? []
    const term = query.trim().toLowerCase()
    if (term) list = list.filter((item) => matchesSearch(item.secret, term))
    if (filter === 'Favourite') list = list.filter((item) => item.favorite)
    if (filter === 'Recent') {
      list = [...list].sort((a, b) =>
        (b.last_used_at ?? b.updated_at).localeCompare(a.last_used_at ?? a.updated_at)
      )
    }
    if (filter === 'Last Edit') {
      list = [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    }
    return list
  }, [items, filter, query])

  if (!keys) return <Redirect href="/unlock" />

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const run = async (change: () => Promise<void>) => {
    try {
      await change()
      await load()
    } catch (err) {
      setBanner(toMessage(err, 'That did not work'))
    }
  }

  return (
    <LinearGradient colors={['#FBFAFE', colors.background]} style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={styles.title}>My Vaults</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        <SearchBar onChangeText={setQuery} placeholder="Search your vaults" value={query} />
        <FilterChips onChange={setFilter} options={filters} value={filter} />
        {error ? <Text style={styles.banner}>{error}</Text> : null}
        {banner ? <Text style={styles.banner}>{banner}</Text> : null}
        <View style={styles.list}>
          {visible.map((item) => (
            <VaultItemRow
              key={item.id}
              item={item}
              onDelete={() => void run(() => trashItem(item.id))}
              onToggleFavorite={(favorite) =>
                void run(() => setItemPlacement(item.id, { folder_id: item.folder_id, favorite }))
              }
            />
          ))}
        </View>
        {items !== null && visible.length === 0 ? (
          <Text style={styles.empty}>
            Nothing here yet. Add a vault in the web app or with the + on home.
          </Text>
        ) : null}
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  banner: {
    color: '#E5484D',
    fontFamily: font.semiBold,
    fontSize: 13,
  },
  content: {
    gap: 16,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  empty: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  headerSpacer: {
    width: 46,
  },
  list: {
    gap: 12,
  },
  screen: {
    flex: 1,
  },
  title: {
    color: colors.navy,
    flex: 1,
    fontFamily: font.extraBold,
    fontSize: 20,
    textAlign: 'center',
  },
})
