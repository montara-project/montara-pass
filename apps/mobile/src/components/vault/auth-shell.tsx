import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, font } from '@/constants/theme'

type AuthShellProps = {
  children: ReactNode
}

/**
 * The shell of the auth screens: the dark hero of the home screen, with the
 * brand mark, and the light sheet the form sits in.
 */
export function AuthShell({ children }: AuthShellProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[colors.heroTop, colors.heroBottom]}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.2, y: 0 }}
        style={[styles.hero, { paddingTop: insets.top + 34 }]}
      >
        <LinearGradient colors={[colors.pink, colors.coral]} style={styles.mark}>
          <Ionicons color="#FFFFFF" name="heart" size={26} />
        </LinearGradient>
        <Text style={styles.title}>Montara Pass</Text>
      </LinearGradient>
      <View style={styles.sheet}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingBottom: 76,
    gap: 12,
  },
  mark: {
    alignItems: 'center',
    borderRadius: 999,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flex: 1,
    gap: 16,
    marginTop: -34,
    paddingHorizontal: 22,
    paddingTop: 28,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: font.extraBold,
    fontSize: 22,
  },
})
