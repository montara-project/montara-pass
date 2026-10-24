import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FilterChips } from '@/components/vault/filter-chips'
import { IconButton } from '@/components/vault/icon-button'
import { SearchBar } from '@/components/vault/search-bar'
import { VaultItemRow } from '@/components/vault/vault-item-row'
import { colors, font } from '@/constants/theme'
import { vaultItems } from '@/data/vaults'

const filters = ['All', 'Recent', 'Favourite', 'Last Edit']

export default function MyVaults() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState(vaultItems)
  const [filter, setFilter] = useState(filters[0])
  const [query, setQuery] = useState('')

  const visibleItems = items.filter((item) =>
    `${item.name} ${item.email}`.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <LinearGradient colors={['#FBFAFE', colors.background]} style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton
          icon="arrow-back"
          onPress={() => (router.canGoBack() ? router.back() : router.push('/'))}
        />
        <Text style={styles.title}>My Vaults</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SearchBar onChangeText={setQuery} placeholder="Search your vaults" value={query} />
        <FilterChips onChange={setFilter} options={filters} value={filter} />
        <View style={styles.list}>
          {visibleItems.map((item) => (
            <VaultItemRow
              key={item.id}
              item={item}
              onDelete={() =>
                setItems((current) => current.filter((candidate) => candidate.id !== item.id))
              }
            />
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 40,
    paddingHorizontal: 20,
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
