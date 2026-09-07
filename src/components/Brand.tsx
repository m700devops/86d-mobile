import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Defs,
  ClipPath,
  RadialGradient,
  Stop,
  Circle,
  G,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

// --- BrandMark: "86'd" rubber-stamp wordmark over a bottle skyline, ported
// from the icon source's 300x300 artboard (same coordinate space as
// assets/icon.png). Keep in sync with icon.png if rebranding. ---

interface BrandMarkProps {
  size?: number;
}

// Body + neck geometry for each bottle, left-to-right (bw/bh = body width/
// height, nw/nh = neck width/height, nx = neck x, centered over the body).
// Bottoms all sit flush on the 300px baseline; heights are irregular on
// purpose so the row reads as a skyline. The red bottle (#3) is the only
// red note — it ties back to the stamp above.
const SKYLINE = [
  { x: 47, bw: 22, bh: 40, nx: 54.5, nw: 7, nh: 16, c: '#17181b' },
  { x: 76, bw: 26, bh: 62, nx: 85, nw: 8, nh: 22, c: '#2b2c30' },
  { x: 109, bw: 20, bh: 34, nx: 115.5, nw: 7, nh: 18, c: '#8a1a26' },
  { x: 136, bw: 30, bh: 70, nx: 146.5, nw: 9, nh: 26, c: '#17181b' },
  { x: 173, bw: 22, bh: 48, nx: 180.5, nw: 7, nh: 15, c: '#2b2c30' },
  { x: 202, bw: 24, bh: 56, nx: 210, nw: 8, nh: 20, c: '#17181b' },
  { x: 233, bw: 20, bh: 32, nx: 239.5, nw: 7, nh: 14, c: '#3a3b40' },
];

export function BrandMark({ size = 88 }: BrandMarkProps) {
  return (
    <View style={[styles.markWrapper, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 300 300">
        <Defs>
          <ClipPath id="brandCardClip">
            <Rect x="0" y="0" width="300" height="300" rx="67" />
          </ClipPath>
          <RadialGradient id="brandVignette" cx="0.78" cy="0.88" r="0.6">
            <Stop offset="0" stopColor="#17181b" stopOpacity="0.12" />
            <Stop offset="0.46" stopColor="#17181b" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <G clipPath="url(#brandCardClip)">
          <Rect x="0" y="0" width="300" height="300" fill="#f2ece4" />

          {SKYLINE.map((b, i) => (
            <G key={i}>
              <Rect x={b.nx} y={300 - b.bh - b.nh} width={b.nw} height={b.nh} fill={b.c} />
              <Rect x={b.x} y={300 - b.bh} width={b.bw} height={b.bh} fill={b.c} />
            </G>
          ))}

          {/* rubber-stamp box, tilted -9deg, sits above the skyline */}
          <G transform="rotate(-9 150 120)">
            <Rect
              x="42"
              y="65"
              width="216"
              height="110"
              rx="10"
              fill="none"
              stroke="#8a1a26"
              strokeWidth={9}
            />
            <SvgText
              x="150"
              y="144"
              textAnchor="middle"
              fontWeight="700"
              fontSize="68"
              fill="#8a1a26"
              letterSpacing={-2}
            >
              86&apos;d
            </SvgText>
          </G>

          <Rect x="0" y="0" width="300" height="300" fill="url(#brandVignette)" />
        </G>
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
