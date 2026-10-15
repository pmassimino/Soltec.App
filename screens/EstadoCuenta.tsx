import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useSujetoSeleccionado } from '../context/SujetoContext';
import { COLORS, SPACING, TYPO } from '../constants/theme';
import { AccountCard, AccountCardSkeleton, CARD_GAP, CARD_WIDTH } from '../components/account/AccountCard';
import { QuickActions } from '../components/common/QuickActions';
import { PendingDocuments } from '../components/common/PendingDocuments';
import { Card, EmptyState, HeaderTail, IconBadge, Section } from '../components/ui';
import { formatFecha, formatKg } from '../utils/formatters';
import { useCuenta } from '../hooks/CuentaHook';

export const EstadoCuentaContent: React.FC = () => {
  const { cuentaSeleccionada } = useSujetoSeleccionado();
  const navigation = useNavigation<any>();

  // Se consulta la API automáticamente cuando idCuenta cambie en el Selector del MainLayout
  const {
    cuentas,
    data,
    loading: loadingCuenta,
    error: errorCuenta,
  } = useCuenta(cuentaSeleccionada?.idCuenta);

  const [activeIndex, setActiveIndex] = useState(0);
  const [hiddenMap, setHiddenMap] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<ScrollView>(null);

  // Volver al primer subdiario/tarjeta cuando el usuario cambie de sujeto
  useEffect(() => {
    if (cuentaSeleccionada?.idCuenta) {
      scrollRef.current?.scrollTo({ x: 0, animated: true });
      setActiveIndex(0);
    }
  }, [cuentaSeleccionada?.idCuenta]);

  const toggleHidden = (id: string) =>
    setHiddenMap((prev) => ({ ...prev, [id]: !prev[id] }));

  const onCardsScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
    setActiveIndex(index);
  };

  const cosechas = data?.cosechas ?? [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <HeaderTail />
      {/* Carrusel de subdiarios, flotando sobre el header */}
      <View style={styles.carouselSection}>
        {loadingCuenta ? (
          <AccountCardSkeleton />
        ) : errorCuenta ? (
          <View style={styles.inset}>
            <EmptyState icon="alert-circle-outline" tone="error" title="No pudimos cargar el saldo" message={errorCuenta} />
          </View>
        ) : cuentas.length > 0 ? (
          <>
            <ScrollView
              ref={scrollRef}
              horizontal
              snapToInterval={CARD_WIDTH + CARD_GAP}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onCardsScrollEnd}
              contentContainerStyle={styles.carouselContent}
            >
              {cuentas.map((cuenta) => (
                <AccountCard
                  key={cuenta.idSubdiario}
                  cuenta={cuenta}
                  isHidden={!!hiddenMap[cuenta.idSubdiario]}
                  onToggleHide={toggleHidden}
                  onVerMovimientos={(idSubdiario) => navigation.navigate('movimientos', { idSubdiario })}
                />
              ))}
            </ScrollView>
            {cuentas.length > 1 && (
              <View style={styles.dots}>
                {cuentas.map((c, i) => (
                  <View key={c.idSubdiario} style={[styles.dot, i === activeIndex && styles.dotActive]} />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.inset}>
            <EmptyState icon="wallet-outline" title="Sin cuentas corrientes" message="Todavía no hay subdiarios para esta cuenta." />
          </View>
        )}
      </View>

      {/* Accesos rápidos */}
      <QuickActions />

      {/* Cosechas */}
      <Section title="Cosechas" badge={cosechas.length || undefined} actionLabel={cosechas.length ? 'Ver todas' : undefined}>
        {cosechas.length > 0 ? (
          <Card style={styles.listCard}>
            {cosechas.map((cosecha, index) => (
              <View
                key={cosecha.id || cosecha.nombre || index}
                style={[styles.listRow, index === cosechas.length - 1 && styles.listRowLast]}
              >
                <IconBadge name="leaf-outline" color={COLORS.green} bg={COLORS.greenSoft} size={40} />
                <View style={styles.listRowText}>
                  <Text style={TYPO.bodyStrong} numberOfLines={1}>{cosecha.nombre || '—'}</Text>
                  <Text style={TYPO.caption}>Saldo en planta</Text>
                </View>
                <Text style={[styles.listRowValue, cosecha.saldo < 0 && { color: COLORS.red }]}>
                  {formatKg(cosecha.saldo)}
                </Text>
              </View>
            ))}
          </Card>
        ) : (
          <EmptyState icon="leaf-outline" title="Sin cosechas" message="No hay cosechas registradas para esta cuenta." />
        )}
      </Section>

      {/* Documentos pendientes */}
      <PendingDocuments
        remitosPendientes={data?.remitos?.pendiente ?? 0}
        facturasPendientes={data?.facturas?.pendiente ?? 0}
      />

      <View style={styles.footer}>
        <Ionicons name="sync-outline" size={12} color={COLORS.textMuted} />
        <Text style={styles.footerText}>Actualizado el {formatFecha(new Date())}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  carouselSection: {},
  carouselContent: { paddingHorizontal: SPACING.lg, gap: CARD_GAP },
  inset: { paddingHorizontal: SPACING.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.md, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#cbd5e1' },
  dotActive: { width: 18, backgroundColor: COLORS.navy },

  listCard: { paddingHorizontal: SPACING.lg },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listRowLast: { borderBottomWidth: 0 },
  listRowText: { flex: 1, marginLeft: SPACING.md, minWidth: 0 },
  listRowValue: { ...TYPO.amount, fontSize: 16, color: COLORS.textDark, marginLeft: SPACING.sm },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
  },
  footerText: { fontSize: 12, color: COLORS.textMuted },
});
