import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { Card, IconName } from '../ui';

interface QuickActionProps {
  icon: IconName;
  label: string;
  color: string;
  bg: string;
  onPress?: () => void;
}

export const QuickActionItem: React.FC<QuickActionProps> = ({ icon, label, color, bg, onPress }) => (
  <Pressable
    style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}
    onPress={onPress}
  >
    <View style={[styles.circle, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.label}>{label}</Text>
  </Pressable>
);

export const QuickActions: React.FC = () => (
  <Card style={styles.row}>
    <QuickActionItem icon="leaf-outline" label="Cosechas" color={COLORS.green} bg={COLORS.greenSoft} />
    <QuickActionItem icon="cube-outline" label="Remitos" color={COLORS.amber} bg={COLORS.amberSoft} />
    <QuickActionItem icon="document-text-outline" label="Facturas" color={COLORS.blue} bg={COLORS.blueSoft} />
    <QuickActionItem icon="download-outline" label="Resumen" color={COLORS.navy} bg={COLORS.bg} />
  </Card>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  item: { alignItems: 'center', flex: 1 },
  circle: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  label: { fontSize: 12, color: COLORS.textBody, fontWeight: '600', textAlign: 'center' },
});
