import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, View } from 'react-native'

import { colors, shadow } from '@/constants/theme'

type IconButtonProps = {
  dot?: boolean
  icon: keyof typeof Ionicons.glyphMap
  onPress?: () => void
}

export function IconButton({ dot, icon, onPress }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, shadow, pressed && styles.pressed]}
    >
      <Ionicons color={colors.navy} name={icon} size={20} />
      {dot ? <View style={styles.dot} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 999,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  dot: {
    backgroundColor: colors.pink,
    borderColor: colors.card,
    borderRadius: 999,
    borderWidth: 2,
    height: 12,
    position: 'absolute',
    right: 8,
    top: 8,
    width: 12,
  },
  pressed: {
    opacity: 0.7,
  },
})
