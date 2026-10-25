import type { VaultItem } from '@montara-pass/shared/types/vault'

import { Ionicons } from '@expo/vector-icons'
import { ITEM_TYPE_LABEL } from '@montara-pass/shared/constants/vault'
import { itemIcon } from '@montara-pass/shared/crypto/vault'
import { Image } from 'expo-image'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, font, shadow } from '@/constants/theme'
import { markItemUsed } from '@/lib/api'

type VaultItemRowProps = {
  item: VaultItem
  onDelete?: () => void
  onToggleFavorite?: (favorite: boolean) => void
}

export function VaultItemRow({ item, onDelete, onToggleFavorite }: VaultItemRowProps) {
  const [favorite, setFavorite] = useState(item.favorite)
  const [revealed, setRevealed] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const secret = item.secret
  const icon = itemIcon(secret)
  const password = secret?.password

  return (
    <View style={[styles.card, shadow]}>
      <Pressable
        onLongPress={onDelete ? () => setShowActions((value) => !value) : undefined}
        style={styles.row}
      >
        <View style={styles.logo}>
          {icon ? (
            <Image source={{ uri: icon }} style={styles.logoImage} />
          ) : (
            <Text style={styles.logoLetter}>{(secret?.name ?? '?').charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.details}>
          <Text numberOfLines={1} style={styles.name}>
            {secret?.name ?? '(unreadable)'}
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {secret?.username || ITEM_TYPE_LABEL[item.type] || item.type}
          </Text>
          {password ? (
            <View style={styles.secretRow}>
              <Text style={styles.secret} numberOfLines={1}>
                {revealed ? password : '••••••••'}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  if (!revealed) void markItemUsed(item.id)
                  setRevealed((value) => !value)
                }}
              >
                <Ionicons color={colors.navy} name={revealed ? 'eye' : 'eye-outline'} size={15} />
              </Pressable>
            </View>
          ) : null}
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => {
            const next = !favorite
            setFavorite(next)
            onToggleFavorite?.(next)
          }}
        >
          <Ionicons
            color={favorite ? colors.pink : colors.heartOff}
            name={favorite ? 'heart' : 'heart-outline'}
            size={20}
          />
        </Pressable>
      </Pressable>
      {showActions && onDelete ? (
        <View style={styles.actions}>
          <Pressable onPress={onDelete} style={styles.actionButton}>
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
    backgroundColor: colors.pink,
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
  details: {
    flex: 1,
    gap: 2,
    marginLeft: 12,
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
  logoImage: {
    borderRadius: 8,
    height: 32,
    width: 32,
  },
  logoLetter: {
    color: colors.navy,
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
    flexShrink: 1,
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
  subtitle: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 12,
  },
})
