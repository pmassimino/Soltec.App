import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, TYPO } from '../constants/theme';
import { Card, HeaderTail, IconBadge, IconName } from '../components/ui';

// Pantalla genérica para secciones que todavía no están implementadas
export const crearProximamente = (titulo: string, icon: IconName) => {
  const Pantalla: React.FC = () => (
    <View>
      <HeaderTail />
      <Card style={styles.card}>
      <IconBadge name={icon} size={64} color={COLORS.navy} bg={COLORS.goldSoft} />
      <Text style={[TYPO.h2, { marginTop: SPACING.lg }]}>{titulo}</Text>
      <Text style={[TYPO.caption, styles.text]}>
        Estamos trabajando en esta sección. Muy pronto vas a poder consultarla desde acá.
        </Text>
      </Card>
    </View>
  );
  return Pantalla;
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.lg,
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xxl,
  },
  text: { textAlign: 'center', marginTop: SPACING.sm, lineHeight: 19 },
});
