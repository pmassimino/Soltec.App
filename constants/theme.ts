import { Platform, TextStyle, ViewStyle } from "react-native";
import { COLORS } from "./colors";

export { COLORS };

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
};

export const TYPO: Record<string, TextStyle> = {
  display: { fontSize: 32, fontWeight: "800", letterSpacing: -0.8, color: COLORS.textDark },
  h1: { fontSize: 24, fontWeight: "800", letterSpacing: -0.4, color: COLORS.textDark },
  h2: { fontSize: 18, fontWeight: "700", letterSpacing: -0.2, color: COLORS.textDark },
  h3: { fontSize: 16, fontWeight: "700", color: COLORS.textDark },
  body: { fontSize: 15, fontWeight: "400", color: COLORS.textBody },
  bodyStrong: { fontSize: 15, fontWeight: "600", color: COLORS.textDark },
  caption: { fontSize: 13, fontWeight: "500", color: COLORS.textGray },
  overline: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: COLORS.textGray,
  },
  // Números alineados para montos
  amount: { fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -0.5 },
};

const shadow = (elevation: number, opacity: number, radius: number, y: number): ViewStyle =>
  Platform.select<ViewStyle>({
    android: { elevation },
    default: {
      shadowColor: "#0b2545",
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: y },
    },
  })!;

export const SHADOW = {
  sm: shadow(1, 0.05, 6, 2),
  md: shadow(3, 0.08, 14, 6),
  lg: shadow(8, 0.14, 24, 12),
};
