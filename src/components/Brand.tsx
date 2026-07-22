import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Ellipse,
  Line,
  Path,
  G,
  Text as SvgText,
} from 'react-native-svg';

// --- BrandMark: "Tilted Pour" — a coupe glass on the app's dark ground,
// replacing the old solid-orange lettering tile. Built on a 100x100
// coordinate space and scaled via viewBox, so `size` just scales cleanly. ---

interface BrandMarkProps {
  size?: number;
}

export function BrandMark({ size = 88 }: BrandMarkProps) {
  const radius = 22;
  return (
    <View style={[styles.markWrapper, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="brandLiquid" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFB067" />
            <Stop offset="100%" stopColor="#E2551F" />
          </LinearGradient>
          <RadialGradient id="brandOlive" cx="35%" cy="30%" r="75%">
            <Stop offset="0%" stopColor="#FFB067" />
            <Stop offset="100%" stopColor="#C2491B" />
          </RadialGradient>
        </Defs>

        <Rect x="0" y="0" width="100" height="100" rx={radius} fill={COLORS_SURFACE} />
        {/* hairline top highlight — subtle, like a native app icon */}
        <Rect
          x="0.75"
          y="0.75"
          width="98.5"
          height="98.5"
          rx={radius - 0.75}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1.5"
        />

        {/* a hint of motion behind the tilt */}
        <Path d="M39,20 L36,25 L48,29" fill="none" stroke="#F3ECE1" strokeWidth="1" opacity="0.18" strokeLinecap="round" />
        <Path d="M35,27 L32,31 L44,34" fill="none" stroke="#F3ECE1" strokeWidth="1" opacity="0.13" strokeLinecap="round" />

        {/* soft grounding shadow */}
        <Ellipse cx="53" cy="80" rx="15" ry="2.6" fill="#000000" opacity="0.35" />

        <G transform="rotate(-16 50 45)">
          <Path d="M31,26 Q50,17 69,26 L51,44 Q50,45 49,44 Z" fill="url(#brandLiquid)" />
          <Path d="M35,23 L39,24 L32,36 L29,34 Z" fill="#F3ECE1" opacity="0.22" />
          <Path d="M31,26 Q50,17 69,26" fill="none" stroke="#F3ECE1" strokeWidth="1.3" opacity="0.55" />
          <Path d="M31,26 L49,44 M69,26 L51,44" fill="none" stroke="#F3ECE1" strokeWidth="1.3" opacity="0.4" />
          <Line x1="50" y1="44" x2="50" y2="60" stroke="#C9BBA9" strokeWidth="2.2" strokeLinecap="round" />
          <Ellipse cx="50" cy="62" rx="12" ry="2.4" fill="none" stroke="#C9BBA9" strokeWidth="2" />
          <Circle cx="50" cy="32" r="3.4" fill="url(#brandOlive)" />
          <Circle cx="48.7" cy="30.6" r="0.8" fill="#FCE7D3" opacity="0.85" />
        </G>

        <SvgText
          x="50"
          y="93"
          textAnchor="middle"
          fontFamily="Georgia"
          fontSize="13.5"
          letterSpacing="0.6"
          fill="#F3ECE1"
        >
          86'd
        </SvgText>
      </Svg>
    </View>
  );
}

const COLORS_SURFACE = '#1A1A1A';

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
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
});
