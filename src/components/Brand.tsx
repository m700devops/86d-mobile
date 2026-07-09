import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';

// --- BrandMark: app-icon style "86'd" tile with gradient + glow ---

interface BrandMarkProps {
  size?: number;
}

export function BrandMark({ size = 88 }: BrandMarkProps) {
  const radius = size * 0.24;
  return (
    <View style={[styles.markWrapper, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="brandTile" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FF7B42" />
            <Stop offset="1" stopColor="#E8551F" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} rx={radius} fill="url(#brandTile)" />
        {/* hairline top highlight — subtle, like a native app icon */}
        <Rect
          x="0.75"
          y="0.75"
          width={size - 1.5}
          height={size - 1.5}
          rx={radius - 0.75}
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.5"
        />
      </Svg>
      <Text
        style={[styles.markText, { fontSize: size * 0.3, width: size }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        86'd
      </Text>
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
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  markText: {
    position: 'absolute',
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
