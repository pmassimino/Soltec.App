import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CuentaCorriente } from '../../services/models';
import { COLORS, RADIUS, SHADOW, SPACING, TYPO } from '../../constants/theme';
import { formatMoney } from '../../utils/formatters';
import { Skeleton } from '../ui';

const { width } = Dimensions.get('window');
export const CARD_GAP = 12;
export const CARD_WIDTH = Math.min(width - SPACING.lg * 2, 520);

interface AccountCardProps {
  cuenta: CuentaCorriente;
  isHidden: boolean;
  onToggleHide: (id: string) => void;
  onVerMovimientos?: (idSubdiario: string) => void;
}

const OCULTO = '••••••';

export const AccountCard: React.FC<AccountCardProps> = ({ cuenta, isHidden, onToggleHide, onVerMovimientos }) => {
  const aVencer = cuenta.saldo - cuenta.saldoVencido;
  const isPositive = cuenta.saldo >= 0;
  const tieneVencido = cuenta.saldoVencido > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleIcon}>
          <Ionicons name="wallet-outline" size={16} color={COLORS.navy} />
        </View>
        <Text style={styles.title} numberOfLines={1}>{cuenta.nombre}</Text>
        <Pressable onPress={() => onToggleHide(cuenta.idSubdiario)} hitSlop={10} style={styles.eyeButton}>
          <Ionicons name={isHidden ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textGray} />
        </Pressable>
      </View>

      <Text style={[TYPO.overline, { marginTop: SPACING.lg }]}>Saldo actual</Text>
      <View style={styles.amountRow}>
        {!isHidden && (
          <Text style={[styles.sign, { color: isPositive ? COLORS.green : COLORS.red }]}>
            {isPositive ? '+' : '−'}
          </Text>
        )}
        <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
          {isHidden ? `$ ${OCULTO}` : formatMoney(cuenta.saldo)}
        </Text>
      </View>

      <View style={styles.tiles}>
        <View style={styles.tile}>
          <View style={styles.tileLabelRow}>
            <Ionicons name="time-outline" size={14} color={COLORS.textGray} />
            <Text style={styles.tileLabel}>A vencer</Text>
          </View>
          <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
            {isHidden ? OCULTO : formatMoney(aVencer)}
          </Text>
        </View>

        <View style={[styles.tile, tieneVencido && styles.tileAlert]}>
          <View style={styles.tileLabelRow}>
            <Ionicons
              name={tieneVencido ? 'alert-circle-outline' : 'checkmark-circle-outline'}
              size={14}
              color={tieneVencido ? COLORS.red : COLORS.green}
            />
            <Text style={[styles.tileLabel, tieneVencido && { color: COLORS.red }]}>Vencido</Text>
          </View>
          <Text
            style={[styles.tileValue, tieneVencido && { color: COLORS.red }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {isHidden ? OCULTO : formatMoney(cuenta.saldoVencido)}
          </Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.7 }]}
        onPress={() => onVerMovimientos?.(cuenta.idSubdiario)}
      >
        <Text style={styles.ctaText}>Ver movimientos</Text>
        <Ionicons name="arrow-forward" size={16} color={COLORS.navy} />
      </Pressable>
    </View>
  );
};

export const AccountCardSkeleton: React.FC = () => (
  <View style={[styles.card, { marginHorizontal: SPACING.lg }]}>
    <Skeleton width="55%" height={16} />
    <Skeleton width={90} height={10} style={{ marginTop: SPACING.xl }} />
    <Skeleton width="70%" height={34} style={{ marginTop: SPACING.sm }} />
    <View style={styles.tiles}>
      <Skeleton height={62} radius={RADIUS.md} style={{ flex: 1 }} />
      <Skeleton height={62} radius={RADIUS.md} style={{ flex: 1 }} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOW.md,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  titleIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: COLORS.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  title: { ...TYPO.h3, flex: 1 },
  eyeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  sign: { fontSize: 28, fontWeight: '800', marginRight: 4 },
  amount: { ...TYPO.amount, flex: 1, fontSize: 34, color: COLORS.textDark },
  tiles: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  tile: {
    flex: 1,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tileAlert: { backgroundColor: COLORS.redSoft, borderColor: '#f9d4d4' },
  tileLabelRow: { flexDirection: 'row', alignItems: 'center' },
  tileLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textGray, marginLeft: 4 },
  tileValue: { ...TYPO.amount, fontSize: 17, color: COLORS.textDark, marginTop: 4 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ctaText: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
});
