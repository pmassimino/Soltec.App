import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, TYPO } from '../../constants/theme';
import { CosechaAgrupada, GrupoCereal } from '../../utils/cosechas';
import { formatKg } from '../../utils/formatters';
import { Card, IconBadge } from '../ui';

const kg = (n: number) => `${n < 0 ? '−' : ''}${formatKg(Math.abs(n))}`;

interface Props {
  grupos: GrupoCereal[];
  onSelect: (cosecha: CosechaAgrupada) => void;
}

/** Lista de cosechas agrupada por cereal: un encabezado por cereal y una fila por campaña. */
export const CosechasAgrupadas: React.FC<Props> = ({ grupos, onSelect }) => (
  <Card style={styles.card}>
    {grupos.map((grupo, gi) => {
      const unica = grupo.cosechas.length === 1 ? grupo.cosechas[0] : null;

      return (
        <View key={grupo.clave} style={[styles.grupo, gi > 0 && styles.grupoSeparado]}>
          {unica ? (
            // Cereal con una sola campaña: toda la fila abre la cosecha
            <Pressable
              onPress={() => onSelect(unica)}
              style={({ pressed }) => [styles.header, pressed && { opacity: 0.7 }]}
            >
              <IconBadge name="leaf-outline" color={COLORS.green} bg={COLORS.greenSoft} size={40} />
              <View style={styles.headerText}>
                <Text style={TYPO.bodyStrong} numberOfLines={1}>{grupo.nombre}</Text>
                <Text style={TYPO.caption} numberOfLines={1}>
                  {unica.campania ? `Campaña ${unica.etiqueta}` : 'Saldo en planta'}
                </Text>
              </View>
              <Text style={[styles.total, unica.saldo < 0 && { color: COLORS.red }]}>{kg(unica.saldo)}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} style={styles.chevron} />
            </Pressable>
          ) : (
            <>
              <View style={styles.header}>
                <IconBadge name="leaf-outline" color={COLORS.green} bg={COLORS.greenSoft} size={40} />
                <View style={styles.headerText}>
                  <Text style={TYPO.bodyStrong} numberOfLines={1}>{grupo.nombre}</Text>
                  <Text style={TYPO.caption}>{grupo.cosechas.length} campañas</Text>
                </View>
                <Text style={[styles.total, grupo.saldo < 0 && { color: COLORS.red }]}>{kg(grupo.saldo)}</Text>
                <View style={styles.chevronSpace} />
              </View>

              <View style={styles.campanias}>
                {grupo.cosechas.map((c, i) => (
                  <Pressable
                    key={`${c.idCosecha}-${c.idSucursal ?? ''}-${i}`}
                    onPress={() => onSelect(c)}
                    style={({ pressed }) => [
                      styles.campania,
                      i < grupo.cosechas.length - 1 && styles.campaniaBorde,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={styles.dot} />
                    <Text style={styles.campaniaLabel} numberOfLines={1}>{c.etiqueta}</Text>
                    <Text style={[styles.campaniaValor, c.saldo < 0 && { color: COLORS.red }]}>{kg(c.saldo)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={styles.chevron} />
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      );
    })}
  </Card>
);

const styles = StyleSheet.create({
  card: { paddingHorizontal: SPACING.lg },
  grupo: { paddingVertical: SPACING.md },
  grupoSeparado: { borderTopWidth: 1, borderTopColor: COLORS.border },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerText: { flex: 1, marginLeft: SPACING.md, minWidth: 0 },
  total: { ...TYPO.amount, fontSize: 16, color: COLORS.textDark, marginLeft: SPACING.sm },
  chevron: { marginLeft: SPACING.sm },
  chevronSpace: { width: 18 + SPACING.sm },
  campanias: {
    marginTop: SPACING.sm,
    marginLeft: 40 + SPACING.md,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
  },
  campania: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm + 2 },
  campaniaBorde: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green, marginRight: SPACING.sm },
  campaniaLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textBody },
  campaniaValor: { ...TYPO.amount, fontSize: 14, color: COLORS.textDark, marginLeft: SPACING.sm },
});
