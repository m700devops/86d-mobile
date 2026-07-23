import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Circle,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

// --- BrandMark: bottle outline with checklist lines and a gold liquid base,
// matching assets/icon.png exactly (same 120x120 coordinate space). Keep in
// sync with icon.png if rebranding. ---

interface BrandMarkProps {
  size?: number;
}

export function BrandMark({ size = 88 }: BrandMarkProps) {
  return (
    <View style={[styles.markWrapper, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id="brandLiquid" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#eab654" />
            <Stop offset="100%" stopColor="#bd8226" />
          </LinearGradient>
        </Defs>

        <Rect width="120" height="120" rx="28" fill="#141110" />

        <Path
          d="M54 20 L54 28 L48 35 L48 80 Q48 84 52 84 L66 84 Q70 84 70 80 L70 35 L64 28 L64 20 Z"
          fill="none"
          stroke="#d9a13e"
          strokeWidth="1.5"
        />

        <Line x1="53" y1="44" x2="65" y2="44" stroke="#d9a13e" strokeWidth="1.1" opacity="0.6" />
        <Line x1="53" y1="51" x2="65" y2="51" stroke="#d9a13e" strokeWidth="1.1" opacity="0.6" />
        <Line x1="53" y1="58" x2="65" y2="58" stroke="#d9a13e" strokeWidth="1.1" opacity="0.6" />

        <Path
          d="M48 70 Q59 66 70 70 L70 80 Q70 84 66 84 L52 84 Q48 84 48 80 Z"
          fill="url(#brandLiquid)"
        />

        <SvgText
          x="59"
          y="80"
          textAnchor="middle"
          fontFamily="Liberation Serif"
          fontWeight="bold"
          fontSize="11"
          fill="#3b230a"
        >
          86'd
        </SvgText>
      </Svg>
    </View>
  );
}

// --- GlowBackground: soft brand-colored radial glows behind auth screens ---

export function GlowBackground() {
  const { width, height } = Dimensions.get('window');
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="glowOrange" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FF6B35" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#FF6B35" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="glowGold" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FFD700" stopOpacity="0.10" />
            <Stop offset="1" stopColor="#FFD700" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={width * 0.92} cy={height * 0.02} r={width * 0.62} fill="url(#glowOrange)" />
        <Circle cx={width * 0.02} cy={height * 0.96} r={width * 0.58} fill="url(#glowGold)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  markWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
