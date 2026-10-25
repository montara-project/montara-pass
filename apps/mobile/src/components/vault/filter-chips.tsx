import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

import { colors, font, shadow } from '@/constants/theme'

type FilterChipsProps = {
  onChange: (value: string) => void
  options: string[]
  value: string
}

export function FilterChips({ onChange, options, value }: FilterChipsProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {options.map((option) => {
        const active = option === value

        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.chip, active ? styles.chipActive : shadow]}
          >
            <Text style={active ? styles.chipTextActive : styles.chipText}>{option}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    marginRight: 10,
    paddingHorizontal: 20,
  },
  chipActive: {
    backgroundColor: colors.pink,
  },
  chipText: {
    color: colors.navy,
    fontFamily: font.semiBold,
    fontSize: 13,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontFamily: font.bold,
    fontSize: 13,
  },
  row: {
    gap: 10,
    paddingRight: 20,
  },
})
