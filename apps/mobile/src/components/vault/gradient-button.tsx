import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text } from 'react-native'

import { colors, font, shadow } from '@/constants/theme'

type GradientButtonProps = {
  busy?: boolean
  label: string
  onPress?: () => void
}

export function GradientButton({ busy, label, onPress }: GradientButtonProps) {
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      style={({ pressed }) => [pressed && !busy && styles.pressed, busy && styles.busy]}
    >
      <LinearGradient
        colors={[colors.pink, colors.coral]}
        end={{ x: 1, y: 0.5 }}
        start={{ x: 0, y: 0.5 }}
        style={[styles.button, shadow]}
      >
        <Text style={styles.label}>{busy ? `${label}…` : label}</Text>
      </LinearGradient>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  busy: {
    opacity: 0.6,
  },
  button: {
    alignItems: 'center',
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontFamily: font.extraBold,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.85,
  },
})
