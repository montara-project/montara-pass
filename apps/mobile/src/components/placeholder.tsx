import { StyleSheet, Text, View, type ViewProps } from 'react-native'

type PlaceholderProps = ViewProps & {
  title: string
}

export function Placeholder({ title, style, ...props }: PlaceholderProps) {
  return (
    <View style={[styles.screen, style]} {...props}>
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
})
