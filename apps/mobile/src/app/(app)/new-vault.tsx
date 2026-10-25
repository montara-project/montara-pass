import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Field } from '@/components/vault/field'
import { GradientButton } from '@/components/vault/gradient-button'
import { IconButton } from '@/components/vault/icon-button'
import { colors, font, shadow } from '@/constants/theme'

export default function NewVault() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [category] = useState('Browser')
  const [address] = useState('https://www.dribbble.com')
  const [name, setName] = useState('hello@designmonk.co')
  const [password, setPassword] = useState('designmonk123')

  return (
    <LinearGradient colors={['#FBFAFE', colors.background]} style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton
          icon="arrow-back"
          onPress={() => (router.canGoBack() ? router.back() : router.push('/'))}
        />
        <Text style={styles.title}>Create New Vaults</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconBlock}>
          <View style={[styles.iconCircle, shadow]}>
            <Ionicons color={colors.pink} name="globe-outline" size={30} />
          </View>
          <Text style={styles.iconCaption}>Change Icon</Text>
        </View>
        <Text style={styles.section}>Credential</Text>
        <Field editable={false} label="Select Categories" select value={category} />
        <Field editable={false} label="Address" select value={address} />
        <Field label="Name" value={name} onChangeValue={setName} />
        <Field label="Password" secure value={password} onChangeValue={setPassword} />
        <View style={styles.typeRow}>
          <Pressable style={[styles.typeChip, styles.typeChipActive]}>
            <Text style={styles.typeChipTextActive}>Login</Text>
          </Pressable>
          <Pressable style={[styles.typeChip, shadow]}>
            <Text style={styles.typeChipText}>Add +</Text>
          </Pressable>
        </View>
        <GradientButton label="Save to the vault" onPress={() => router.back()} />
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 44,
    paddingHorizontal: 22,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  headerSpacer: {
    width: 46,
  },
  iconBlock: {
    alignItems: 'center',
    gap: 6,
  },
  iconCaption: {
    color: colors.muted,
    fontFamily: font.semiBold,
    fontSize: 12,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 999,
    height: 74,
    justifyContent: 'center',
    width: 74,
  },
  screen: {
    flex: 1,
  },
  section: {
    color: colors.navy,
    fontFamily: font.extraBold,
    fontSize: 18,
    marginTop: 8,
  },
  title: {
    color: colors.navy,
    flex: 1,
    fontFamily: font.extraBold,
    fontSize: 20,
    textAlign: 'center',
  },
  typeChip: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 999,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  typeChipActive: {
    backgroundColor: colors.pinkSoft,
  },
  typeChipText: {
    color: colors.navy,
    fontFamily: font.semiBold,
    fontSize: 13,
  },
  typeChipTextActive: {
    color: colors.pink,
    fontFamily: font.bold,
    fontSize: 13,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
})
