import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, TextInput, View } from 'react-native'

import { colors, font, shadow } from '@/constants/theme'

type SearchBarProps = {
  onChangeText?: (text: string) => void
  placeholder: string
  value?: string
}

export function SearchBar({ onChangeText, placeholder, value }: SearchBarProps) {
  return (
    <View style={[styles.bar, shadow]}>
      <Ionicons color={colors.muted} name="search" size={18} />
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={value}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 10,
    height: 52,
    paddingHorizontal: 18,
  },
  input: {
    color: colors.navy,
    flex: 1,
    fontFamily: font.semiBold,
    fontSize: 14,
  },
})
