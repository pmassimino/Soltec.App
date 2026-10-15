import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPO } from '../../constants/theme';
import { Card, IconBadge, IconName, Section, StatusPill } from '../ui';

interface PendingRowProps {
  icon: IconName;
  color: string;
  bg: string;
  label: string;
  count: number;
  onPress?: () => void;
}

const PendingRow: React.FC<PendingRowProps> = ({ icon, color, bg, label, count, onPress }) => {
  const hayPendientes = count > 0;

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <IconBadge name={icon} color={color} bg={bg} />
      <View style={styles.content}>
        <Text style={TYPO.bodyStrong}>{label}</Text>
        <Text style={TYPO.caption}>
          {hayPendientes ? `${count} ${count === 1 ? 'documento' : 'documentos'} por revisar` : 'Todo al día'}
        </Text>
      </View>
      <StatusPill label={hayPendientes ? String(count) : 'OK'} tone={hayPendientes ? 'warn' : 'ok'} />
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} style={{ marginLeft: SPACING.sm }} />
    </Pressable>
  );
};

interface PendingDocumentsProps {
  remitosPendientes?: number;
  facturasPendientes?: number;
  onRemitos?: () => void;
  onFacturas?: () => void;
}

export const PendingDocuments: React.FC<PendingDocumentsProps> = ({
  remitosPendientes = 0,
  facturasPendientes = 0,
  onRemitos,
  onFacturas,
}) => {
  const total = remitosPendientes + facturasPendientes;

  return (
    <Section title="Documentos pendientes" badge={total > 0 ? total : undefined}>
      <Card style={styles.card}>
        <PendingRow
          icon="cube-outline"
          color={COLORS.amber}
          bg={COLORS.amberSoft}
          label="Remitos"
          count={remitosPendientes}
          onPress={onRemitos}
        />
        <View style={styles.divider} />
        <PendingRow
          icon="document-text-outline"
          color={COLORS.blue}
          bg={COLORS.blueSoft}
          label="Facturas"
          count={facturasPendientes}
          onPress={onFacturas}
        />
      </Card>
    </Section>
  );
};

const styles = StyleSheet.create({
  card: { paddingHorizontal: SPACING.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md + 2 },
  content: { flex: 1, marginLeft: SPACING.md },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 56 },
});
