import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AuthService } from '../services/authService';
import { useSujetoSeleccionado } from '../context/SujetoContext';
import { COLORS, SPACING, TYPO } from '../constants/theme';
import { Button, Card, HeaderTail, IconBadge, IconName, Section } from '../components/ui';
import { iniciales } from '../utils/formatters';

const OptionRow: React.FC<{ icon: IconName; label: string; last?: boolean }> = ({ icon, label, last }) => (
  <Pressable style={({ pressed }) => [styles.option, !last && styles.optionBorder, pressed && { opacity: 0.7 }]}>
    <IconBadge name={icon} size={36} />
    <Text style={[TYPO.bodyStrong, { flex: 1, marginLeft: SPACING.md }]}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
  </Pressable>
);

export const PerfilScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { cuentasSujeto, cuentaSeleccionada } = useSujetoSeleccionado();

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      // El padre del Tab.Navigator es el stack raíz: lo reiniciamos hacia LoginScreen
      (navigation.getParent() ?? navigation).reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      });
    } catch {
      Alert.alert('Error', 'No se pudo cerrar la sesión.');
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: SPACING.xxxl }}>
      <HeaderTail />
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{iniciales(cuentaSeleccionada?.nombre)}</Text>
        </View>
        <Text style={[TYPO.h2, { marginTop: SPACING.md, textAlign: 'center' }]}>
          {cuentaSeleccionada?.nombre ?? 'Mi cuenta'}
        </Text>
        <Text style={TYPO.caption}>
          {cuentasSujeto.length} {cuentasSujeto.length === 1 ? 'cuenta asociada' : 'cuentas asociadas'}
        </Text>
      </Card>

      <Section title="Preferencias">
        <Card style={styles.optionsCard}>
          <OptionRow icon="notifications-outline" label="Notificaciones" />
          <OptionRow icon="shield-checkmark-outline" label="Seguridad" />
          <OptionRow icon="help-circle-outline" label="Ayuda y contacto" last />
        </Card>
      </Section>

      <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.xxl }}>
        <Button label="Cerrar sesión" variant="danger" icon="log-out-outline" onPress={handleLogout} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    marginHorizontal: SPACING.lg,
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: COLORS.navy, fontSize: 24, fontWeight: '800' },
  optionsCard: { paddingHorizontal: SPACING.lg },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
});
