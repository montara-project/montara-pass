import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { colors, font, shadow } from '@/constants/theme'

type FieldProps = {
  editable?: boolean
  label: string
  onChangeValue?: (text: string) => void
  select?: boolean
  secure?: boolean
  value: string
}

export function Field({
  editable = true,
  label,
  onChangeValue,
  select,
  secure,
  value,
}: FieldProps) {
  const [revealed, setRevealed] = useState(false)

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.input, shadow]}>
        <TextInput
          editable={editable}
          onChangeText={onChangeValue}
          secureTextEntry={secure && !revealed}
          style={styles.inputText}
          value={value}
        />
        {select ? <Ionicons color={colors.navy} name="chevron-down" size={18} /> : null}
        {secure ? (
          <Pressable
            hitSlop={6}
            onPress={() => setRevealed((state) => !state)}
            style={styles.viewPill}
          >
            <Text style={styles.viewPillText}>{revealed ? 'Hide' : 'View'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    height: 54,
    paddingHorizontal: 16,
  },
  inputText: {
    color: colors.navy,
    flex: 1,
    fontFamily: font.semiBold,
    fontSize: 14,
  },
  label: {
    color: colors.navy,
    fontFamily: font.bold,
    fontSize: 13,
    marginBottom: 8,
  },
  viewPill: {
    backgroundColor: colors.pinkSoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  viewPillText: {
    color: colors.pink,
    fontFamily: font.bold,
    fontSize: 12,
  },
})
