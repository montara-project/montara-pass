import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text } from 'react-native'

import { colors, font, shadow } from '@/constants/theme'

type GradientButtonProps = {
  label: string
  onPress?: () => void
}

export function GradientButton({ label, onPress }: GradientButtonProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <LinearGradient
        colors={[colors.pink, colors.coral]}
        end={{ x: 1, y: 0.5 }}
        start={{ x: 0, y: 0.5 }}
        style={[styles.button, shadow]}
      >
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Pressable>
  )
}

const styles = StyleSheet.create({
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
