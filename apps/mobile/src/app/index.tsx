import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CategoryCard } from '@/components/vault/category-card'
import { HealthGauge } from '@/components/vault/health-gauge'
import { IconButton } from '@/components/vault/icon-button'
import { SearchBar } from '@/components/vault/search-bar'
import { VaultItemRow } from '@/components/vault/vault-item-row'
import { colors, font } from '@/constants/theme'
import { recentVaults, vaultCategories } from '@/data/vaults'

export default function Home() {
  const insets = useSafeAreaInsets()

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
              <Text style={styles.greeting}>Hello Rakib 👋</Text>
              <Text style={styles.greetingSub}>Welcome back again!</Text>
            </View>
            <IconButton dot icon="notifications-outline" />
          </View>
          <View style={styles.gaugeWrap}>
            <HealthGauge percent={75} />
          </View>
        </LinearGradient>
        <View style={styles.sheet}>
          <SearchBar placeholder="Search your vaults" />
          <View style={styles.categories}>
            {vaultCategories.map((category) => (
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
          <View style={styles.recent}>
            {recentVaults.map((item) => (
              <VaultItemRow key={item.id} item={item} />
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
  hero: {
    paddingBottom: 100,
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
