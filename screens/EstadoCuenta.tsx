import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  Platform,
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
import { CosechasAgrupadas } from '../components/common/CosechasAgrupadas';
import { agruparPorCereal } from '../utils/cosechas';
import { EmptyState, HeaderTail, Section } from '../components/ui';
import { formatFecha } from '../utils/formatters';
import { useCuenta } from '../hooks/CuentaHook';
import { ComprobanteService, PdfDescargado } from '../services/ComprobanteService';
import { PdfViewerModal } from '../components/common/PdfViewerModal';

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
  const [descargandoResumen, setDescargandoResumen] = useState(false);
  const [pdfVisible, setPdfVisible] = useState<PdfDescargado | null>(null);
  const comprobanteService = useMemo(() => new ComprobanteService(), []);

  const mostrarError = (titulo: string, err: unknown, fallback: string) => {
    const msg = err instanceof Error ? err.message : fallback;
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert(titulo, msg);
  };

  // Resumen de cta. cte. del subdiario que está visible en el carrusel
  const descargarResumen = async () => {
    const subdiario = cuentas[Math.min(activeIndex, cuentas.length - 1)];
    if (!cuentaSeleccionada || !subdiario || descargandoResumen) return;
    setDescargandoResumen(true);
    try {
      const pdf = await comprobanteService.descargarResumenCtaCte(
        cuentaSeleccionada.idCuenta,
        subdiario.idSubdiario,
        subdiario.idDivisa,
        subdiario.nombre
      );
      if (pdf) setPdfVisible(pdf);
    } catch (err) {
      mostrarError('Resumen', err, 'No pudimos descargar el resumen.');
    } finally {
      setDescargandoResumen(false);
    }
  };

  const compartirPdf = async (pdf: PdfDescargado) => {
    try {
      await comprobanteService.compartirPdf(pdf);
    } catch (err) {
      mostrarError('Compartir', err, 'No se pudo compartir el resumen.');
    }
  };
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

  // Se calcula en onScroll (no en onMomentumScrollEnd) porque este último no se dispara en web
  const onCardsScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
    setActiveIndex((prev) => (prev === index ? prev : index));
  };

  const cosechas = data?.cosechas ?? [];
  const gruposCosechas = useMemo(() => agruparPorCereal(cosechas), [cosechas]);

  return (
    <>
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
                onScroll={onCardsScroll}
                scrollEventThrottle={16}
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
        <QuickActions
          onCosechas={() => navigation.navigate('cosechas')}
          onRemitos={() => navigation.navigate('remitos')}
          onFacturas={() => navigation.navigate('facturas')}
          onResumen={descargarResumen}
          resumenLoading={descargandoResumen}
        />

        {/* Cosechas */}
        <Section
          title="Cosechas"
          badge={gruposCosechas.length || undefined}
          actionLabel={cosechas.length ? 'Ver todas' : undefined}
          onAction={() => navigation.navigate('cosechas')}
        >
          {cosechas.length > 0 ? (
            <CosechasAgrupadas
              grupos={gruposCosechas}
              onSelect={(c) => navigation.navigate('cosechas', { idCosecha: c.idCosecha, idSucursal: c.idSucursal })}
            />
          ) : (
            <EmptyState icon="leaf-outline" title="Sin cosechas" message="No hay cosechas registradas para esta cuenta." />
          )}
        </Section>

        {/* Documentos pendientes */}
        <PendingDocuments
          remitosPendientes={data?.remitos?.pendiente ?? 0}
          facturasPendientes={data?.facturas?.pendiente ?? 0}
          onRemitos={() => navigation.navigate('remitos')}
          onFacturas={() => navigation.navigate('facturas')}
        />

        <View style={styles.footer}>
          <Ionicons name="sync-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.footerText}>Actualizado el {formatFecha(new Date())}</Text>
        </View>
      </ScrollView>
      <PdfViewerModal pdf={pdfVisible} onClose={() => setPdfVisible(null)} onShare={compartirPdf} />
    </>
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
