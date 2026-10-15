import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useSujetoSeleccionado } from '../context/SujetoContext';
import { TipoPendiente, useDocumentosPendientes } from '../hooks/PendientesHook';
import { DetallePendiente, DocumentoPendiente } from '../services/models';
import { COLORS, RADIUS, SHADOW, SPACING, TYPO } from '../constants/theme';
import { Card, EmptyState, HeaderTail, IconBadge, IconName, Skeleton, StatusPill } from '../components/ui';
import { formatFecha, formatMoney } from '../utils/formatters';

const ITEMS_VISIBLES = 3;
// Espacio no separable: evita que el importe se corte en dos líneas
const NBSP = String.fromCharCode(160);

interface ConfigPendiente {
  titulo: string;
  subtitulo: string;
  documento: string;
  documentos: string;
  icon: IconName;
  color: string;
  bg: string;
  error: string;
  vacio: string;
}

const CONFIG: Record<TipoPendiente, ConfigPendiente> = {
  remitos: {
    titulo: 'Remitos pendientes',
    subtitulo: 'De facturar · último año',
    documento: 'Remito',
    documentos: 'Remitos',
    icon: 'cube-outline',
    color: COLORS.amber,
    bg: COLORS.amberSoft,
    error: 'No pudimos cargar los remitos',
    vacio: 'No tenés remitos pendientes de facturar.',
  },
  facturas: {
    titulo: 'Facturas pendientes',
    subtitulo: 'Con ítems pendientes · últimos 3 años',
    documento: 'Factura',
    documentos: 'Facturas',
    icon: 'document-text-outline',
    color: COLORS.blue,
    bg: COLORS.blueSoft,
    error: 'No pudimos cargar las facturas',
    vacio: 'No tenés facturas con ítems pendientes.',
  },
};

const formatCantidad = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });

/* ---------- Línea de artículo ---------- */
const ItemPendiente: React.FC<{ item: DetallePendiente }> = ({ item }) => {
  const facturado = item.cantidad > 0 ? Math.min(1, Math.max(0, 1 - item.cantidadPendiente / item.cantidad)) : 0;

  return (
    <View style={styles.item}>
      <View style={styles.itemTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.itemDesc} numberOfLines={2}>{item.descripcion || 'Artículo'}</Text>
          {!!item.idArticulo && <Text style={styles.itemCode}>Cód. {item.idArticulo}</Text>}
        </View>
        <View style={styles.itemQty}>
          <Text style={styles.itemPend}>{formatCantidad(item.cantidadPendiente)}</Text>
          <Text style={styles.itemTotal}>de {formatCantidad(item.cantidad)}</Text>
        </View>
      </View>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${facturado * 100}%` }]} />
      </View>
    </View>
  );
};

/* ---------- Tarjeta de documento ---------- */
const DocumentoCard: React.FC<{ doc: DocumentoPendiente; config: ConfigPendiente }> = ({ doc, config }) => {
  const [expandido, setExpandido] = useState(false);
  const pendientes = doc.detalle.filter((d) => d.cantidadPendiente > 0);
  const lineas = pendientes.length ? pendientes : doc.detalle;
  const visibles = expandido ? lineas : lineas.slice(0, ITEMS_VISIBLES);
  const ocultos = lineas.length - visibles.length;

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <IconBadge name={config.icon} color={config.color} bg={config.bg} size={40} />
        <View style={styles.cardTitle}>
          <Text style={TYPO.bodyStrong} numberOfLines={1}>{config.documento} {doc.numero}</Text>
          <Text style={TYPO.caption}>
            {formatFecha(doc.fechaComprobante)}
            {doc.total ? ` · Total${NBSP}${formatMoney(doc.total).replace(' ', NBSP)}` : ''}
          </Text>
        </View>
        <StatusPill
          label={`${lineas.length} ${lineas.length === 1 ? 'ítem' : 'ítems'}`}
          tone="warn"
        />
      </View>

      {!!doc.observaciones && (
        <Text style={styles.obs} numberOfLines={expandido ? undefined : 2}>{doc.observaciones}</Text>
      )}

      <View style={styles.items}>
        <View style={styles.itemsHeader}>
          <Text style={TYPO.overline}>Artículo</Text>
          <Text style={TYPO.overline}>Pendiente</Text>
        </View>
        {visibles.map((d, i) => (
          <ItemPendiente key={`${d.idArticulo}-${i}`} item={d} />
        ))}
      </View>

      {(ocultos > 0 || expandido) && lineas.length > ITEMS_VISIBLES && (
        <Pressable onPress={() => setExpandido((v) => !v)} hitSlop={8} style={styles.more}>
          <Text style={styles.moreText}>{expandido ? 'Ver menos' : `Ver ${ocultos} más`}</Text>
          <Ionicons name={expandido ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.navy} />
        </Pressable>
      )}
    </Card>
  );
};

/* ---------- Pantalla ---------- */
const DocumentosPendientesScreen: React.FC<{ tipo: TipoPendiente }> = ({ tipo }) => {
  const config = CONFIG[tipo];
  const navigation = useNavigation<any>();
  const { cuentaSeleccionada } = useSujetoSeleccionado();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useDocumentosPendientes(tipo, cuentaSeleccionada?.idCuenta, refreshKey);

  const documentos = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.fechaComprobante.getTime() - a.fechaComprobante.getTime()),
    [data]
  );
  const totalItems = documentos.reduce((a, r) => a + r.detalle.filter((d) => d.cantidadPendiente > 0).length, 0);
  const primeraCarga = loading && !data;

  const header = (
    <View>
      <HeaderTail />
      <Card style={styles.summary}>
        <View style={styles.summaryTop}>
          <Pressable
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('resumen'))}
            hitSlop={10}
            style={styles.backButton}
            accessibilityLabel="Volver"
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.navy} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={TYPO.h2}>{config.titulo}</Text>
            <Text style={TYPO.caption}>{config.subtitulo}</Text>
          </View>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.stat}>
            <Text style={TYPO.overline}>{config.documentos}</Text>
            {primeraCarga ? <Skeleton width={40} height={22} style={{ marginTop: 4 }} /> : (
              <Text style={styles.statValue}>{documentos.length}</Text>
            )}
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={TYPO.overline}>Ítems pendientes</Text>
            {primeraCarga ? <Skeleton width={40} height={22} style={{ marginTop: 4 }} /> : (
              <Text style={styles.statValue}>{totalItems}</Text>
            )}
          </View>
        </View>
      </Card>

      {primeraCarga &&
        [0, 1].map((i) => (
          <Card key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <Skeleton width={40} height={40} radius={12} />
              <View style={styles.cardTitle}>
                <Skeleton width="60%" />
                <Skeleton width="35%" height={10} style={{ marginTop: 6 }} />
              </View>
            </View>
            <Skeleton height={40} radius={8} style={{ marginTop: SPACING.lg }} />
          </Card>
        ))}

      {error && !loading && (
        <View style={styles.inset}>
          <EmptyState icon="alert-circle-outline" tone="error" title={config.error} message={error} />
        </View>
      )}
      {!loading && !error && data && documentos.length === 0 && (
        <View style={styles.inset}>
          <EmptyState icon="checkmark-done-outline" title="Sin pendientes" message={config.vacio} />
        </View>
      )}
    </View>
  );

  return (
    <FlatList
      data={primeraCarga || error ? [] : documentos}
      keyExtractor={(r, i) => `${r.id}-${i}`}
      ListHeaderComponent={header}
      renderItem={({ item }) => <DocumentoCard doc={item} config={config} />}
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
  );
};

export const RemitosScreen: React.FC = () => <DocumentosPendientesScreen tipo="remitos" />;
export const FacturasScreen: React.FC = () => <DocumentosPendientesScreen tipo="facturas" />;

const styles = StyleSheet.create({
  inset: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  summary: { marginHorizontal: SPACING.lg, padding: SPACING.xl, ...SHADOW.md },
  summaryTop: { flexDirection: 'row', alignItems: 'center' },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  summaryStats: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stat: { flex: 1 },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  statValue: { ...TYPO.amount, fontSize: 22, color: COLORS.textDark, marginTop: 2 },

  card: { marginHorizontal: SPACING.lg, marginTop: SPACING.md, padding: SPACING.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { flex: 1, marginLeft: SPACING.md, minWidth: 0 },
  obs: { ...TYPO.caption, marginTop: SPACING.md, fontStyle: 'italic' },

  items: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  item: { paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start' },
  itemDesc: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  itemCode: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  itemQty: { alignItems: 'flex-end', marginLeft: SPACING.md },
  itemPend: { ...TYPO.amount, fontSize: 15, color: COLORS.amber },
  itemTotal: { fontSize: 11, color: COLORS.textMuted },
  progress: { height: 4, borderRadius: 2, backgroundColor: COLORS.amberSoft, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: 2 },

  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: SPACING.md },
  moreText: { fontSize: 13, fontWeight: '700', color: COLORS.navy },
});
