import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, font, shadow } from '@/constants/theme'

export type VaultCategory = {
  count: number
  icon: 'card-outline' | 'document-text-outline' | 'globe-outline'
  label: string
}

type CategoryCardProps = VaultCategory & {
  onPress?: () => void
}

export function CategoryCard({ count, icon, label, onPress }: CategoryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, shadow, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons color={colors.pink} name={icon} size={22} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.count}>{String(count).padStart(2, '0')} Password</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    flex: 1,
    gap: 8,
    paddingVertical: 18,
  },
  count: {
    color: colors.muted,
    fontFamily: font.semiBold,
    fontSize: 11,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.actionTile,
    borderRadius: 999,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  label: {
    color: colors.navy,
    fontFamily: font.bold,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.85,
  },
})
