export const COLORS = {
  primaryDark: '#0F0F0F',
  surface: '#1A1A1A',
  border: '#2D2D2D',
  // Brand red (the logo's stamp). Fills, borders, glows, buttons — white text
  // on it is ~5:1. Too dark for small text on the dark UI: use accentText.
  accentPrimary: '#C8283A',
  // Pressed / darker state of an accentPrimary fill.
  accentPressed: '#9E1C28',
  // Red TEXT and small red icons on a dark background (headlines, labels,
  // quantities). accentPrimary on #0F0F0F is only ~3.5:1.
  accentText: '#F0566A',
  // Background of a focused input: the dark surface with a hint of the red.
  accentTintSurface: '#1A1214',
  accentSecondary: '#FFD700',
  // Text on a gold (accentSecondary) fill
  onAccentSecondary: '#1A1400',
  success: '#4ADE80',
  warning: '#FDE047',
  // Errors and destructive actions. Deliberately NOT the brand red: a brighter
  // yellower red (iOS system red), and every error MESSAGE carries an alert icon
  // (components/ErrorMessage) so it never reads as an accent.
  error: '#FF453A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textTertiary: '#737373',
};

// Tinted accent fills: rgba of accentPrimary at the given alpha.
export const accentAlpha = (alpha: number) => `rgba(200, 40, 58, ${alpha})`;

// One colour per distributor on the order screen, so the same distributor is
// the same colour on every order. Picked by the distributor's place in the
// bar's (name-sorted) distributor list, not by its place in this order —
// otherwise whoever happens to come first that week would take the red.
// The brand red first; the rest are distinct hues that read on the dark UI.
export const DISTRIBUTOR_COLORS = [
  '#C8283A', // brand red (accentPrimary)
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#14B8A6', // teal
  '#EC4899', // pink
  '#84CC16', // lime
];
