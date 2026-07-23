import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  ClipPath,
  Stop,
  Circle,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

// --- BrandMark: bottle outline with tally lines and a gold "86'd" base,
// matching assets/icon.png. Built on a 100x100 coordinate space and scaled
// via viewBox, so `size` just scales cleanly. Keep in sync with icon.png
// if rebranding. ---

const BOTTLE_PATH =
  'M44.6,10.7 H55.4 V23.4 C59.6,23.4 72.7,29.3 72.7,40 V77.1 A4.5,4.5 0 0 1 68.2,81.6 H31.8 A4.5,4.5 0 0 1 27.3,77.1 V40 C27.3,29.3 40.4,23.4 44.6,23.4 Z';

interface BrandMarkProps {
  size?: number;
}

export function BrandMark({ size = 88 }: BrandMarkProps) {
  return (
    <View style={[styles.markWrapper, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="brandStroke" gradientUnits="userSpaceOnUse" x1="27.3" y1="10.7" x2="72.7" y2="81.6">
            <Stop offset="0%" stopColor={COLORS.accentSecondary} />
            <Stop offset="100%" stopColor={COLORS.accentPrimary} />
          </LinearGradient>
          <LinearGradient id="brandFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFD966" />
            <Stop offset="100%" stopColor="#FF9A3D" />
          </LinearGradient>
          <ClipPath id="brandClip">
            <Path d={BOTTLE_PATH} />
          </ClipPath>
        </Defs>

        <Rect x="22.5" y="64.1" width="55.1" height="22.5" fill="url(#brandFill)" clipPath="url(#brandClip)" />

        <Path d={BOTTLE_PATH} fill="none" stroke="url(#brandStroke)" strokeWidth="1.6" strokeLinejoin="round" />

        <Line x1="34.2" y1="46.7" x2="65.8" y2="46.7" stroke="url(#brandStroke)" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="34.2" y1="53.5" x2="65.8" y2="53.5" stroke="url(#brandStroke)" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="34.2" y1="60.4" x2="65.8" y2="60.4" stroke="url(#brandStroke)" strokeWidth="1.5" strokeLinecap="round" />

        <SvgText
          x="50"
          y="78.1"
          textAnchor="middle"
          fontFamily="Georgia"
          fontWeight="bold"
          fontSize="11"
          fill="#2A1708"
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
