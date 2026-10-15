// components/layout/MainLayout.tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { SujetoProvider, useSujetoSeleccionado } from '../../context/SujetoContext';
import { COLORS, SPACING, TYPO } from '../../constants/theme';
import { AccountSelectorModal } from '../account/AccountSelectorModal';
import { AuthService } from '../../services/authService';
import { Button, IconBadge } from '../ui';
import { iniciales } from '../../utils/formatters';

interface MainLayoutProps {
  children: React.ReactNode;
}

const saludo = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buen día';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

const MainLayoutContent: React.FC<MainLayoutProps> = ({ children }) => {
  const {
    cuentasSujeto,
    cuentaSeleccionada,
    seleccionarCuenta,
    loading: loadingSujeto,
    error: errorSujeto,
  } = useSujetoSeleccionado();

  const [selectorVisible, setSelectorVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const multiCuenta = cuentasSujeto.length > 1;

  const handleElegirSujeto = (idCuenta: string) => {
    setSelectorVisible(false);
    if (idCuenta !== cuentaSeleccionada?.idCuenta) {
      seleccionarCuenta(idCuenta);
    }
  };

  const volverALogin = async () => {
    await AuthService.logout();
    navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
  };

  if (loadingSujeto && !cuentaSeleccionada) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: COLORS.navy }]}>
        <StatusBar style="light" />
        <View style={styles.splashLogo}>
          <Text style={styles.logoText}>▲</Text>
        </View>
        <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.xxl }} />
        <Text style={styles.loadingText}>Cargando tu información…</Text>
      </View>
    );
  }

  if (errorSujeto) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar style="dark" />
        <IconBadge name="cloud-offline-outline" color={COLORS.red} bg={COLORS.redSoft} size={72} />
        <Text style={[TYPO.h1, { marginTop: SPACING.xl }]}>No pudimos cargar tus cuentas</Text>
        <Text style={[TYPO.body, styles.errorText]}>{errorSujeto}</Text>
        <Button label="Volver a ingresar" icon="log-in-outline" onPress={volverALogin} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Header superior fijo */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{iniciales(cuentaSeleccionada?.nombre)}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.accountSelector, pressed && { opacity: 0.7 }]}
            onPress={() => setSelectorVisible(true)}
            disabled={!multiCuenta}
          >
            <Text style={styles.greeting}>{saludo()}</Text>
            <View style={styles.accountRow}>
              <Text style={styles.accountName} numberOfLines={1}>
                {cuentaSeleccionada?.nombre || 'Mi cuenta'}
              </Text>
              {multiCuenta && <Ionicons name="chevron-down" size={16} color={COLORS.gold} style={{ marginLeft: 4 }} />}
            </View>
            {!!cuentaSeleccionada?.idCuenta && (
              <Text style={styles.accountCode}>Cuenta N° {cuentaSeleccionada.idCuenta}</Text>
            )}
          </Pressable>

          <Pressable style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]} hitSlop={6}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>
      </View>

      {/* Modal selector de sujeto */}
      <AccountSelectorModal
        visible={selectorVisible}
        cuentasSujeto={cuentasSujeto}
        cuentaSeleccionadaId={cuentaSeleccionada?.idCuenta}
        onSelectCuenta={handleElegirSujeto}
        onClose={() => setSelectorVisible(false)}
      />

      {/* Contenido dinámico: acá entra el Tab.Navigator completo,
          con sus pantallas y el toolbar inferior incluidos */}
      <View style={styles.body}>{children}</View>
    </View>
  );
};

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <SujetoProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </SujetoProvider>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  body: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    padding: SPACING.xxl,
  },
  splashLogo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: COLORS.navySoft,
    borderWidth: 1,
    borderColor: COLORS.navyBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: SPACING.md, fontSize: 14, color: COLORS.textOnDarkMuted },
  errorText: { textAlign: 'center', color: COLORS.textGray, marginTop: SPACING.sm, marginBottom: SPACING.xxl },

  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: { color: COLORS.navy, fontSize: 16, fontWeight: '800' },
  logoText: { color: COLORS.gold, fontSize: 28, fontWeight: '800' },
  accountSelector: { flex: 1, minWidth: 0 },
  greeting: { color: COLORS.textOnDarkMuted, fontSize: 12, fontWeight: '500' },
  accountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  accountName: { color: COLORS.white, fontSize: 17, fontWeight: '800', flexShrink: 1, letterSpacing: -0.2 },
  accountCode: { color: COLORS.textOnDarkMuted, fontSize: 11, marginTop: 1 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.navySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
    borderWidth: 1.5,
    borderColor: COLORS.navy,
  },
});
