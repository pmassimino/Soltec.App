// Componentes base reutilizables del sistema de diseño
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW, SPACING, TYPO } from "../../constants/theme";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

/* ---------- Card ---------- */
export const Card: React.FC<{ style?: StyleProp<ViewStyle>; children: React.ReactNode }> = ({
  style,
  children,
}) => <View style={[styles.card, style]}>{children}</View>;

/* ---------- HeaderTail ----------
   Continuación curva del header azul dentro de cada pantalla. El primer
   elemento que le sigue sube sobre ella y queda "flotando". */
export const HeaderTail: React.FC = () => <View style={styles.headerTail} />;

/* ---------- Section ---------- */
interface SectionProps {
  title: string;
  badge?: string | number;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, badge, actionLabel, onAction, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={TYPO.h2}>{title}</Text>
      {badge !== undefined && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <View style={{ flex: 1 }} />
      {actionLabel && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
    {children}
  </View>
);

/* ---------- IconBadge ---------- */
interface IconBadgeProps {
  name: IconName;
  color?: string;
  bg?: string;
  size?: number;
}

export const IconBadge: React.FC<IconBadgeProps> = ({
  name,
  color = COLORS.navy,
  bg = COLORS.bg,
  size = 44,
}) => (
  <View style={[styles.iconBadge, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg }]}>
    <Ionicons name={name} size={size * 0.48} color={color} />
  </View>
);

/* ---------- EmptyState ---------- */
export const EmptyState: React.FC<{ icon: IconName; title: string; message?: string; tone?: "neutral" | "error" }> = ({
  icon,
  title,
  message,
  tone = "neutral",
}) => (
  <Card style={styles.empty}>
    <IconBadge
      name={icon}
      color={tone === "error" ? COLORS.red : COLORS.textGray}
      bg={tone === "error" ? COLORS.redSoft : COLORS.bg}
      size={48}
    />
    <Text style={[TYPO.h3, { marginTop: SPACING.md, textAlign: "center" }]}>{title}</Text>
    {message ? <Text style={[TYPO.caption, { marginTop: 4, textAlign: "center" }]}>{message}</Text> : null}
  </Card>
);

/* ---------- Button ---------- */
interface ButtonProps {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  icon,
  style,
}) => {
  const palette = {
    primary: { bg: COLORS.navy, fg: COLORS.white, border: COLORS.navy },
    secondary: { bg: COLORS.white, fg: COLORS.navy, border: COLORS.border },
    danger: { bg: COLORS.redSoft, fg: COLORS.red, border: COLORS.redSoft },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        inactive && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={palette.fg} style={{ marginRight: 8 }} />}
          <Text style={[styles.buttonText, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
};

/* ---------- Skeleton ---------- */
export const Skeleton: React.FC<{ width?: number | `${number}%`; height?: number; radius?: number; style?: StyleProp<ViewStyle> }> = ({
  width = "100%",
  height = 14,
  radius = 6,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: "#e2e8f0", opacity }, style]}
    />
  );
};

/* ---------- Pill de estado ---------- */
export const StatusPill: React.FC<{ label: string; tone: "ok" | "warn" | "error" | "neutral" }> = ({ label, tone }) => {
  const p = {
    ok: [COLORS.greenSoft, COLORS.green],
    warn: [COLORS.amberSoft, COLORS.amber],
    error: [COLORS.redSoft, COLORS.red],
    neutral: [COLORS.bg, COLORS.textGray],
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: p[0] }]}>
      <View style={[styles.pillDot, { backgroundColor: p[1] }]} />
      <Text style={[styles.pillText, { color: p[1] }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    ...SHADOW.sm,
  },
  headerTail: {
    height: 64,
    marginBottom: -52,
    backgroundColor: COLORS.navy,
    borderBottomLeftRadius: RADIUS.xxl,
    borderBottomRightRadius: RADIUS.xxl,
  },
  section: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xxl },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.md },
  sectionAction: { fontSize: 13, fontWeight: "700", color: COLORS.navy },
  badge: {
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.goldSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  badgeText: { color: COLORS.amber, fontSize: 12, fontWeight: "800" },
  iconBadge: { justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.xl },
  button: {
    height: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  buttonText: { fontSize: 16, fontWeight: "700" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  pillText: { fontSize: 12, fontWeight: "700" },
});
