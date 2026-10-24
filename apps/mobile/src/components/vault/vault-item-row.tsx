import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { VaultItem } from '@/data/vaults'

import { colors, font, shadow } from '@/constants/theme'

type VaultItemRowProps = {
  item: VaultItem
  onDelete?: () => void
}

export function VaultItemRow({ item, onDelete }: VaultItemRowProps) {
  const [favorite, setFavorite] = useState(item.favorite)
  const [revealed, setRevealed] = useState(false)
  const [showActions, setShowActions] = useState(false)

  return (
    <View style={[styles.card, shadow]}>
      <Pressable onLongPress={() => setShowActions((value) => !value)} style={styles.row}>
        <View style={styles.logo}>
          <Text style={[styles.logoLetter, { color: item.letterColor }]}>{item.letter}</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
          <View style={styles.secretRow}>
            <Text style={styles.secret}>{revealed ? '12345678' : '••••••••'}</Text>
            <Pressable hitSlop={8} onPress={() => setRevealed((value) => !value)}>
              <Ionicons color={colors.navy} name={revealed ? 'eye' : 'eye-outline'} size={15} />
            </Pressable>
          </View>
        </View>
        <Pressable hitSlop={8} onPress={() => setFavorite((value) => !value)}>
          <Ionicons
            color={favorite ? colors.pink : colors.heartOff}
            name={favorite ? 'heart' : 'heart-outline'}
            size={20}
          />
        </Pressable>
      </Pressable>
      {showActions ? (
        <View style={styles.actions}>
          <Pressable
            onPress={() => setShowActions(false)}
            style={[styles.actionButton, styles.editAction]}
          >
            <Ionicons color="#FFFFFF" name="pencil" size={16} />
          </Pressable>
          <Pressable onPress={onDelete} style={[styles.actionButton, styles.deleteAction]}>
            <Ionicons color="#FFFFFF" name="trash-outline" size={16} />
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  actions: {
    alignItems: 'center',
    bottom: 10,
    flexDirection: 'row',
    gap: 10,
    position: 'absolute',
    right: 14,
    zIndex: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 12,
  },
  deleteAction: {
    backgroundColor: colors.pink,
  },
  details: {
    flex: 1,
    gap: 2,
    marginLeft: 12,
  },
  editAction: {
    backgroundColor: '#1B1D4D',
  },
  email: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 12,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    elevation: 2,
    height: 46,
    justifyContent: 'center',
    shadowColor: '#6F6C8F',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    width: 46,
  },
  logoLetter: {
    fontFamily: font.extraBold,
    fontSize: 22,
  },
  name: {
    color: colors.navy,
    fontFamily: font.bold,
    fontSize: 15,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  secret: {
    color: '#3A3C55',
    fontFamily: font.bold,
    fontSize: 12,
    letterSpacing: 2,
  },
  secretRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
})
