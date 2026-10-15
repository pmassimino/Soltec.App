import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useSujetoSeleccionado } from '../context/SujetoContext';
import { useMovimientos } from '../hooks/MovimientosHook';
import { Movimiento } from '../services/models';
import { tipoComprobante } from '../services/ComprobanteService';
import { useComprobantePdf } from '../hooks/ComprobantePdfHook';
import { COLORS, RADIUS, SHADOW, SPACING, TYPO } from '../constants/theme';
import { Card, Chip, EmptyState, HeaderTail, Skeleton } from '../components/ui';
import { formatMoney } from '../utils/formatters';

export type MovimientosParams = { idSubdiario?: string } | undefined;

const PERIODOS = [
  { dias: 30, label: '30 días' },
  { dias: 60, label: '60 días' },
  { dias: 90, label: '90 días' },
  { dias: 180, label: '6 meses' },
  { dias: 365, label: '1 año' },
];

const fechaCorta = (d: Date) =>
  d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const tituloMes = (d: Date) => {
  const s = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* ---------- Fila de movimiento ---------- */
interface MovimientoRowProps {
  mov: Movimiento;
  descargando: boolean;
  onDescargar: (mov: Movimiento) => void;
}

const MovimientoRow: React.FC<MovimientoRowProps> = ({ mov, descargando, onDescargar }) => {
  const [abierto, setAbierto] = useState(false);
  const esDebe = mov.haber === 0;
  const importe = esDebe ? mov.debe : mov.haber;
  const comprobante = mov.tieneComprobante ? tipoComprobante(mov.idTransaccion, mov.tipo) : null;
  const esVencido = mov.vencido && esDebe;

  return (
    <Pressable onPress={() => setAbierto((v) => !v)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
      <View style={styles.rowTop}>
        <View style={[styles.rowIcon, { backgroundColor: esDebe ? COLORS.bg : COLORS.greenSoft }]}>
          <Ionicons
            name={esDebe ? 'arrow-up' : 'arrow-down'}
            size={16}
            color={esDebe ? COLORS.navy : COLORS.green}
          />
        </View>

        <View style={styles.rowBody}>
          <Text style={TYPO.bodyStrong} numberOfLines={abierto ? undefined : 1}>
            {mov.concepto || mov.tipo || 'Movimiento'}
          </Text>
          <View style={styles.rowMeta}>
            <Text style={TYPO.caption}>{fechaCorta(mov.fechaComprobante)}</Text>
            {!!mov.numeroComprobante && (
              <Text style={TYPO.caption} numberOfLines={1}> · {mov.numeroComprobante}</Text>
            )}
          </View>
        </View>

        <View style={styles.rowAmounts}>
          <Text style={[styles.rowImporte, !esDebe && { color: COLORS.green }]}>
            {esDebe ? '' : '−'}{formatMoney(importe)}
          </Text>
          <View style={styles.rowTags}>
            {esVencido && <Text style={styles.vencidoTag}>Vencido</Text>}
            {comprobante ? (
              <Pressable
                onPress={() => onDescargar(mov)}
                disabled={descargando}
                hitSlop={10}
                accessibilityLabel={`Descargar ${comprobante.nombre.toLowerCase()} en PDF`}
                style={({ pressed }) => [styles.pdfChip, pressed && { opacity: 0.6 }]}
              >
                {descargando ? (
                  <ActivityIndicator size={10} color={COLORS.navy} />
                ) : (
                  <Ionicons name="download-outline" size={11} color={COLORS.navy} />
                )}
                <Text style={styles.pdfChipText}>PDF</Text>
              </Pressable>
            ) : (
              !esVencido && <Text style={styles.rowTipo}>{esDebe ? 'Debe' : 'Haber'}</Text>
            )}
          </View>
        </View>
      </View>

      {abierto && (
        <View style={styles.detail}>
          <DetailItem label="Vencimiento" value={fechaCorta(mov.fechaVencimiento)} alert={esVencido} />
          <DetailItem label="Saldo" value={`${mov.saldo < 0 ? '−' : ''}${formatMoney(mov.saldo)}`} />
          <DetailItem label="Comprobante" value={comprobante?.nombre ?? (mov.tipo || '—')} />
          {comprobante && (
            <Pressable
              onPress={() => onDescargar(mov)}
              disabled={descargando}
              style={({ pressed }) => [styles.pdfLink, pressed && { opacity: 0.7 }]}
            >
              {descargando ? (
                <ActivityIndicator size="small" color={COLORS.navy} />
              ) : (
                <Ionicons name="document-text-outline" size={16} color={COLORS.navy} />
              )}
              <Text style={styles.pdfLinkText}>
                {descargando ? 'Descargando…' : `Ver ${comprobante.nombre.toLowerCase()} en PDF`}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
};

const DetailItem: React.FC<{ label: string; value: string; alert?: boolean }> = ({ label, value, alert }) => (
  <View style={styles.detailItem}>
    <Text style={TYPO.overline}>{label}</Text>
    <Text style={[styles.detailValue, alert && { color: COLORS.red }]}>{value}</Text>
  </View>
);

/* ---------- Pantalla ---------- */
export const MovimientosScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ movimientos: MovimientosParams }, 'movimientos'>>();
  const { cuentaSeleccionada } = useSujetoSeleccionado();
  const subdiarios = cuentaSeleccionada?.subdiarios ?? [];

  const [idSubdiario, setIdSubdiario] = useState<string | undefined>(route.params?.idSubdiario);
  const [dias, setDias] = useState(60);
  const [refreshKey, setRefreshKey] = useState(0);
  const { descargandoId, descargar, visor } = useComprobantePdf(cuentaSeleccionada?.idCuenta);

  // Llega un subdiario desde "Ver movimientos" de la tarjeta
  useEffect(() => {
    if (route.params?.idSubdiario) setIdSubdiario(route.params.idSubdiario);
  }, [route.params?.idSubdiario]);

  // Si cambia la cuenta (o el subdiario no existe en ella), tomar el primero
  useEffect(() => {
    if (!subdiarios.some((s) => s.idSubdiario === idSubdiario)) {
      setIdSubdiario(subdiarios[0]?.idSubdiario);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentaSeleccionada?.idCuenta]);

  const subdiario = subdiarios.find((s) => s.idSubdiario === idSubdiario);
  const { data, loading, error } = useMovimientos(
    cuentaSeleccionada?.idCuenta,
    subdiario?.idSubdiario,
    dias,
    subdiario?.idDivisa ?? 0,
    refreshKey
  );

  const movimientos = data ?? [];
  const resumen = useMemo(() => {
    const ultimo = movimientos[movimientos.length - 1];
    return {
      saldo: ultimo?.saldo ?? 0,
      vencido: ultimo?.saldoVencido ?? 0,
      debe: movimientos.reduce((a, m) => a + m.debe, 0),
      haber: movimientos.reduce((a, m) => a + m.haber, 0),
    };
  }, [movimientos]);

  // Agrupado por mes, lo más reciente arriba
  const secciones = useMemo(() => {
    const ordenados = [...movimientos].sort(
      (a, b) => b.fechaComprobante.getTime() - a.fechaComprobante.getTime() || b.orden - a.orden
    );
    const grupos: { title: string; data: Movimiento[] }[] = [];
    for (const m of ordenados) {
      const title = tituloMes(m.fechaComprobante);
      const g = grupos[grupos.length - 1];
      if (g && g.title === title) g.data.push(m);
      else grupos.push({ title, data: [m] });
    }
    return grupos;
  }, [movimientos]);

  const primeraCarga = loading && !data;

  const header = (
    <View>
      <HeaderTail />
      {/* Resumen del período */}
      <Card style={styles.summary}>
        <Text style={TYPO.overline}>Saldo al cierre del período</Text>
        {primeraCarga ? (
          <Skeleton width="60%" height={32} style={{ marginTop: 6 }} />
        ) : (
          <Text style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>
            {resumen.saldo < 0 ? '−' : ''}{formatMoney(resumen.saldo)}
          </Text>
        )}
        <View style={styles.summaryStats}>
          <Stat label="Debe" value={formatMoney(resumen.debe)} icon="arrow-up" color={COLORS.navy} />
          <View style={styles.statDivider} />
          <Stat label="Haber" value={formatMoney(resumen.haber)} icon="arrow-down" color={COLORS.green} />
          <View style={styles.statDivider} />
          <Stat
            label="Vencido"
            value={formatMoney(resumen.vencido)}
            icon="alert-circle-outline"
            color={resumen.vencido > 0 ? COLORS.red : COLORS.textGray}
          />
        </View>
      </Card>

      {/* Filtros */}
      {subdiarios.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {subdiarios.map((s) => (
            <Chip
              key={s.idSubdiario}
              label={s.nombre}
              active={s.idSubdiario === idSubdiario}
              onPress={() => setIdSubdiario(s.idSubdiario)}
            />
          ))}
        </ScrollView>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {PERIODOS.map((p) => (
          <Chip key={p.dias} label={p.label} active={p.dias === dias} onPress={() => setDias(p.dias)} />
        ))}
      </ScrollView>

      {primeraCarga && (
        <Card style={styles.listCard}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.rowTop, styles.row]}>
              <Skeleton width={34} height={34} radius={10} />
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Skeleton width="70%" />
                <Skeleton width="40%" height={10} style={{ marginTop: 6 }} />
              </View>
              <Skeleton width={70} />
            </View>
          ))}
        </Card>
      )}
      {error && !loading && (
        <View style={styles.inset}>
          <EmptyState icon="alert-circle-outline" tone="error" title="No pudimos cargar los movimientos" message={error} />
        </View>
      )}
      {!loading && !error && data && movimientos.length === 0 && (
        <View style={styles.inset}>
          <EmptyState
            icon="receipt-outline"
            title="Sin movimientos"
            message="No hay movimientos en el período elegido. Probá con un rango más amplio."
          />
        </View>
      )}
    </View>
  );

  return (
    <>
      <SectionList
        sections={primeraCarga || error ? [] : secciones}
        keyExtractor={(m, i) => `${m.idTransaccion}-${m.orden}-${i}`}
        ListHeaderComponent={header}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text style={styles.monthTitle}>{section.title}</Text>}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.itemWrap,
              index === 0 && styles.itemFirst,
              index === section.data.length - 1 && styles.itemLast,
            ]}
          >
            <MovimientoRow
              mov={item}
              descargando={descargandoId === item.idTransaccion}
              onDescargar={(mov) => descargar(mov.idTransaccion, mov.tipo, mov.numeroComprobante)}
            />
            {index < section.data.length - 1 && <View style={styles.divider} />}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: SPACING.xxxl }}
        refreshControl={
          <RefreshControl
            refreshing={loading && !!data}
            onRefresh={() => setRefreshKey((k) => k + 1)}
            tintColor={COLORS.navy}
            colors={[COLORS.navy]}
          />
        }
      />
      {visor}
    </>
  );
};

const Stat: React.FC<{ label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = ({
  label,
  value,
  icon,
  color,
}) => (
  <View style={styles.stat}>
    <View style={styles.statLabelRow}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  inset: { paddingHorizontal: SPACING.lg, marginTop: SPACING.sm },
  summary: { marginHorizontal: SPACING.lg, padding: SPACING.xl, ...SHADOW.md },
  summaryAmount: { ...TYPO.amount, fontSize: 30, color: COLORS.textDark, marginTop: 4 },
  summaryStats: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stat: { flex: 1 },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.sm },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 12, fontWeight: '700' },
  statValue: { ...TYPO.amount, fontSize: 14, color: COLORS.textDark, marginTop: 2 },

  chipsRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, paddingTop: SPACING.md },

  monthTitle: {
    ...TYPO.overline,
    paddingHorizontal: SPACING.lg + 4,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  listCard: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg, paddingHorizontal: SPACING.lg },
  itemWrap: { backgroundColor: COLORS.white, marginHorizontal: SPACING.lg, paddingHorizontal: SPACING.lg },
  itemFirst: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, paddingTop: 4 },
  itemLast: { borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl, paddingBottom: 4 },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 46 },

  row: { paddingVertical: SPACING.md },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowBody: { flex: 1, marginLeft: SPACING.md, minWidth: 0 },
  rowMeta: { flexDirection: 'row', marginTop: 2, flexShrink: 1 },
  rowAmounts: { alignItems: 'flex-end', marginLeft: SPACING.sm },
  rowImporte: { ...TYPO.amount, fontSize: 15, color: COLORS.textDark },
  rowTipo: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  vencidoTag: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.red,
    backgroundColor: COLORS.redSoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  detail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.md,
    marginLeft: 46,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.lg,
  },
  detailItem: { minWidth: 80 },
  rowTags: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  pdfChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  pdfChipText: { fontSize: 10, fontWeight: '800', color: COLORS.navy, letterSpacing: 0.3 },
  pdfLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    height: 40,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  pdfLinkText: { fontSize: 13, fontWeight: '700', color: COLORS.navy },
  detailValue: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginTop: 2 },
});
