import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg'

import { colors, font, shadow } from '@/constants/theme'

const size = 236
const stroke = 13
const ballSize = 186
const center = size / 2
const radius = (size - stroke) / 2
const circumference = 2 * Math.PI * radius

type HealthGaugeProps = {
  percent: number
}

export function HealthGauge({ percent }: HealthGaugeProps) {
  const dash = circumference * (percent / 100)

  return (
    <View style={styles.wrap}>
      <Svg height={size} width={size}>
        <Defs>
          <SvgGradient id="ring" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor={colors.pink} />
            <Stop offset="1" stopColor={colors.gradientEnd} />
          </SvgGradient>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          stroke={colors.ringTrack}
          strokeWidth={stroke}
        />
        <Circle
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          stroke="url(#ring)"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          strokeWidth={stroke}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <LinearGradient
        colors={['#FF6E9E', '#F9247C']}
        end={{ x: 0.7, y: 1 }}
        start={{ x: 0.3, y: 0 }}
        style={styles.ball}
      >
        <Text style={styles.ballLabel}>Health Score</Text>
        <Text style={styles.ballValue}>{percent}%</Text>
      </LinearGradient>
      <View style={[styles.badge, shadow]}>
        <Ionicons color={colors.pink} name="heart" size={20} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  ball: {
    alignItems: 'center',
    borderRadius: ballSize / 2,
    height: ballSize,
    justifyContent: 'center',
    left: (size - ballSize) / 2,
    position: 'absolute',
    top: (size - ballSize) / 2,
    width: ballSize,
  },
  ballLabel: {
    color: '#FFFFFF',
    fontFamily: font.semiBold,
    fontSize: 15,
  },
  ballValue: {
    color: '#FFFFFF',
    fontFamily: font.extraBold,
    fontSize: 44,
    marginTop: 2,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 999,
    bottom: 0,
    height: 46,
    justifyContent: 'center',
    left: (size - 46) / 2,
    position: 'absolute',
    width: 46,
  },
  wrap: {
    height: size,
    width: size,
  },
})
