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
import { useCuenta } from '../hooks/CuentaHook';
import { useEntradasCereal, useLiquidacionesCereal, useMovimientosCereal } from '../hooks/CosechaHook';
import { useComprobantePdf } from '../hooks/ComprobantePdfHook';
import { ConceptoLiquidacion, Entrada, Liquidacion, MovimientoCereal } from '../services/models';
import { tipoComprobante } from '../services/ComprobanteService';
import { COLORS, RADIUS, SHADOW, SPACING, TYPO } from '../constants/theme';
import { Card, Chip, EmptyState, HeaderTail, Skeleton } from '../components/ui';
import { formatKg, formatMoney } from '../utils/formatters';

export type CosechasParams = { idCosecha?: string; idSucursal?: string } | undefined;

const claveCosecha = (idCosecha?: string, idSucursal?: string) => `${idCosecha ?? ''}|${idSucursal ?? ''}`;

const fechaCorta = (d: Date) =>
  d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const tituloMes = (d: Date) => {
  const s = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const kgConSigno = (n: number) => `${n < 0 ? '−' : ''}${formatKg(Math.abs(n))}`;

const esEntrada = (mov: MovimientoCereal) =>
  mov.tipo.toUpperCase() === 'ENTRADA' || mov.idTransaccion.toUpperCase().startsWith('ENTRADA;');

// "ENTRADA;001;0045120" y "45120" se comparan por el número sin ceros a la izquierda
const numeroRomaneo = (valor: string) => (valor.split(';')[2] ?? valor).trim().replace(/^0+/, '');

/** Índice de entradas por idTransaccion y por número de romaneo, para vincularlas con los ingresos. */
const indexarEntradas = (entradas: Entrada[]) => {
  const porId = new Map<string, Entrada>();
  const porNumero = new Map<string, Entrada>();
  for (const e of entradas) {
    if (e.idTransaccion) porId.set(e.idTransaccion.toUpperCase(), e);
    if (e.numero) porNumero.set(numeroRomaneo(e.numero), e);
  }
  return (mov: MovimientoCereal) =>
    porId.get(mov.idTransaccion.toUpperCase()) ?? porNumero.get(numeroRomaneo(mov.idTransaccion));
};

const porcentaje = (n: number) => `${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;

/* ---------- Detalle de una entrada (romaneo) ---------- */
const EntradaDetalle: React.FC<{ entrada: Entrada }> = ({ entrada }) => {
  const patentes = [entrada.patenteChasis, entrada.patenteAcoplado].filter(Boolean).join(' / ');
  const datos = (
    [
      ['Carta de porte', entrada.cartaPorte],
      ['CTG', entrada.ctg],
      ['Planta', entrada.planta],
      ['Procedencia', entrada.procedencia],
      ['Patentes', patentes],
      ['Transporte', entrada.transporte],
      ['Chofer', entrada.chofer],
    ] as [string, string][]
  ).filter(([, v]) => !!v);

  return (
    <View style={styles.entrada}>
      <Text style={TYPO.overline}>Pesaje</Text>
      <View style={styles.pesos}>
        <Peso label="Bruto" value={entrada.pesoBruto} />
        <Peso label="Tara" value={entrada.pesoTara} />
        <Peso label="Neto" value={entrada.pesoNeto} />
      </View>

      {entrada.mermas.length > 0 && (
        <View style={styles.mermas}>
          {entrada.mermas.map((m) => (
            <View key={m.concepto} style={styles.mermaRow}>
              <Text style={styles.mermaLabel}>Merma {m.concepto.toLowerCase()}</Text>
              <Text style={styles.mermaPct}>{porcentaje(m.porcentaje)}</Text>
              <Text style={styles.mermaKg}>−{formatKg(m.kilos)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.netoFinal}>
        <Text style={styles.netoFinalLabel}>Neto final</Text>
        <Text style={styles.netoFinalValue}>{formatKg(entrada.pesoNetoFinal || entrada.pesoNeto)}</Text>
      </View>

      {datos.length > 0 && (
        <>
          <Text style={[TYPO.overline, { marginTop: SPACING.md }]}>Transporte</Text>
          {datos.map(([label, value]) => (
            <View key={label} style={styles.datoRow}>
              <Text style={styles.datoLabel}>{label}</Text>
              <Text style={styles.datoValue} numberOfLines={2}>{value}</Text>
            </View>
          ))}
        </>
      )}

      {!!entrada.observacion && <Text style={styles.entradaObs}>{entrada.observacion}</Text>}
    </View>
  );
};

const Peso: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <View style={styles.peso}>
    <Text style={styles.pesoLabel}>{label} (kg)</Text>
    <Text style={styles.pesoValue} numberOfLines={1} adjustsFontSizeToFit>
      {value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
    </Text>
  </View>
);

/* ---------- Fila de movimiento ---------- */
interface MovimientoRowProps {
  mov: MovimientoCereal;
  /** Detalle del romaneo, solo para ingresos de tipo ENTRADA */
  entrada?: Entrada;
  cargandoEntrada?: boolean;
  descargando: boolean;
  onDescargar: (mov: MovimientoCereal) => void;
}

const MovimientoCerealRow: React.FC<MovimientoRowProps> = ({
  mov,
  entrada,
  cargandoEntrada,
  descargando,
  onDescargar,
}) => {
  const [abierto, setAbierto] = useState(false);
  const sinKilos = mov.ingreso === 0 && mov.egreso === 0; // p. ej. certificados
  const esIngreso = mov.ingreso !== 0;
  const kilos = esIngreso ? mov.ingreso : mov.egreso;
  const icono = sinKilos
    ? { name: 'document-outline' as const, color: COLORS.textGray, bg: COLORS.bg }
    : esIngreso
      ? { name: 'arrow-down' as const, color: COLORS.green, bg: COLORS.greenSoft }
      : { name: 'arrow-up' as const, color: COLORS.amber, bg: COLORS.amberSoft };
  const comprobante = mov.tieneComprobante ? tipoComprobante(mov.idTransaccion, mov.tipo) : null;

  return (
    <Pressable onPress={() => setAbierto((v) => !v)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
      <View style={styles.rowTop}>
        <View style={[styles.rowIcon, { backgroundColor: icono.bg }]}>
          <Ionicons name={icono.name} size={16} color={icono.color} />
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
          <Text style={[styles.rowKilos, { color: sinKilos ? COLORS.textMuted : esIngreso ? COLORS.green : COLORS.textDark }]}>
            {sinKilos ? '' : esIngreso ? '+' : '−'}{formatKg(kilos)}
          </Text>
          <View style={styles.rowTags}>
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
              <Text style={styles.rowTipo}>{sinKilos ? '' : esIngreso ? 'Ingreso' : 'Egreso'}</Text>
            )}
          </View>
        </View>
      </View>

      {abierto && (
        <View style={styles.detail}>
          <DetailItem label="Saldo" value={kgConSigno(mov.saldo)} />
          {mov.pesoNeto !== 0 && !entrada && <DetailItem label="Peso neto" value={formatKg(mov.pesoNeto)} />}
          <DetailItem label="Comprobante" value={comprobante?.nombre ?? (mov.tipo || '—')} />
          {entrada ? (
            <EntradaDetalle entrada={entrada} />
          ) : (
            cargandoEntrada && (
              <View style={styles.entradaCargando}>
                <ActivityIndicator size="small" color={COLORS.navy} />
                <Text style={TYPO.caption}>Cargando detalle de la entrada…</Text>
              </View>
            )
          )}
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

/* ---------- Fila de entrada (vista Ingresos) ---------- */
interface EntradaRowProps {
  entrada: Entrada;
  /** idTransaccion para el PDF (el de la entrada o el del movimiento vinculado) */
  idComprobante?: string;
  descargando: boolean;
  onDescargar: (idTransaccion: string, numero: string) => void;
}

const EntradaRow: React.FC<EntradaRowProps> = ({ entrada, idComprobante, descargando, onDescargar }) => {
  const [abierto, setAbierto] = useState(false);
  const mermaTotal = entrada.mermas.reduce((a, m) => a + m.kilos, 0);

  return (
    <Pressable onPress={() => setAbierto((v) => !v)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
      <View style={styles.rowTop}>
        <View style={[styles.rowIcon, { backgroundColor: COLORS.greenSoft }]}>
          <Ionicons name="arrow-down" size={16} color={COLORS.green} />
        </View>

        <View style={styles.rowBody}>
          <Text style={TYPO.bodyStrong} numberOfLines={1}>
            Entrada {entrada.numero || '—'}
          </Text>
          <View style={styles.rowMeta}>
            <Text style={TYPO.caption}>{fechaCorta(entrada.fecha)}</Text>
            {!!entrada.cartaPorte && <Text style={TYPO.caption} numberOfLines={1}> · CP {entrada.cartaPorte}</Text>}
          </View>
        </View>

        <View style={styles.rowAmounts}>
          <Text style={[styles.rowKilos, { color: COLORS.green }]}>
            +{formatKg(entrada.pesoNetoFinal || entrada.pesoNeto)}
          </Text>
          <View style={styles.rowTags}>
            {idComprobante ? (
              <Pressable
                onPress={() => onDescargar(idComprobante, entrada.numero)}
                disabled={descargando}
                hitSlop={10}
                accessibilityLabel="Descargar entrada en PDF"
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
              mermaTotal > 0 && <Text style={styles.rowTipo}>Merma −{formatKg(mermaTotal)}</Text>
            )}
          </View>
        </View>
      </View>

      {abierto && (
        <View style={styles.detail}>
          <EntradaDetalle entrada={entrada} />
          {idComprobante && (
            <Pressable
              onPress={() => onDescargar(idComprobante, entrada.numero)}
              disabled={descargando}
              style={({ pressed }) => [styles.pdfLink, pressed && { opacity: 0.7 }]}
            >
              {descargando ? (
                <ActivityIndicator size="small" color={COLORS.navy} />
              ) : (
                <Ionicons name="document-text-outline" size={16} color={COLORS.navy} />
              )}
              <Text style={styles.pdfLinkText}>{descargando ? 'Descargando…' : 'Ver entrada en PDF'}</Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
};

/* ---------- Fila de liquidación (vista Liquidado) ---------- */
// Compara números de comprobante ignorando ceros, guiones y prefijos ("LIQUI;001;0;01-00000892" ~ "0001-00000892")
const soloDigitos = (valor: string) => (valor.split(';').pop() ?? valor).replace(/\D/g, '').replace(/^0+/, '');

const pesos = (n: number) => `${n < 0 ? '−' : ''}${formatMoney(n)}`;

const LineaImporte: React.FC<{ label: string; value: number; negativo?: boolean; fuerte?: boolean }> = ({
  label,
  value,
  negativo,
  fuerte,
}) => (
  <View style={styles.lineaImporte}>
    <Text style={[styles.lineaLabel, fuerte && styles.lineaFuerte]} numberOfLines={2}>{label}</Text>
    <Text style={[styles.lineaValor, negativo && { color: COLORS.amber }, fuerte && styles.lineaFuerte]}>
      {negativo ? '−' : ''}{formatMoney(value)}
    </Text>
  </View>
);

const nombreConcepto = (c: ConceptoLiquidacion) =>
  c.alicuota ? `${c.nombre} (${c.alicuota.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%)` : c.nombre;

const LiquidacionDetalle: React.FC<{ liq: Liquidacion }> = ({ liq }) => {
  const datos = (
    [
      ['COE', liq.coe],
      ['Operación', liq.tipoOperacion],
      ['Certificado', liq.numeroCertificado],
      ['Procedencia', liq.procedencia],
    ] as [string, string][]
  ).filter(([, v]) => !!v);

  return (
    <View style={styles.entrada}>
      <View style={styles.pesos}>
        <View style={styles.peso}>
          <Text style={styles.pesoLabel}>Kilos</Text>
          <Text style={styles.pesoValue} numberOfLines={1} adjustsFontSizeToFit>
            {liq.pesoNeto.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.peso}>
          <Text style={styles.pesoLabel}>Precio</Text>
          <Text style={styles.pesoValue} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(liq.precio)}</Text>
        </View>
      </View>

      <View style={styles.mermas}>
        <LineaImporte label="Importe bruto" value={liq.importeBruto} />
        {liq.deducciones.map((d, i) => (
          <LineaImporte key={`d-${i}`} label={nombreConcepto(d)} value={Math.abs(d.importe)} negativo />
        ))}
        {liq.importeIva !== 0 && <LineaImporte label="IVA" value={liq.importeIva} />}
        {liq.retenciones.map((r, i) => (
          <LineaImporte key={`r-${i}`} label={`Ret. ${nombreConcepto(r)}`} value={Math.abs(r.importe)} negativo />
        ))}
      </View>

      <View style={styles.netoFinal}>
        <Text style={styles.netoFinalLabel}>Neto a cobrar</Text>
        <Text style={[styles.netoFinalValue, { color: COLORS.navy }]}>{pesos(liq.importeFinal)}</Text>
      </View>

      {datos.length > 0 &&
        datos.map(([label, value]) => (
          <View key={label} style={[styles.datoRow, label === 'COE' && { marginTop: SPACING.sm }]}>
            <Text style={styles.datoLabel}>{label}</Text>
            <Text style={styles.datoValue} numberOfLines={2}>{value}</Text>
          </View>
        ))}
    </View>
  );
};

interface LiquidacionRowProps {
  liq: Liquidacion;
  idComprobante?: string;
  descargando: boolean;
  onDescargar: (idTransaccion: string, numero: string) => void;
}

const LiquidacionRow: React.FC<LiquidacionRowProps> = ({ liq, idComprobante, descargando, onDescargar }) => {
  const [abierto, setAbierto] = useState(false);

  return (
    <Pressable onPress={() => setAbierto((v) => !v)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
      <View style={styles.rowTop}>
        <View style={[styles.rowIcon, { backgroundColor: COLORS.blueSoft }]}>
          <Ionicons name="cash-outline" size={16} color={COLORS.blue} />
        </View>

        <View style={styles.rowBody}>
          <Text style={TYPO.bodyStrong} numberOfLines={1}>
            Liquidación {liq.numero || '—'}
          </Text>
          <View style={styles.rowMeta}>
            <Text style={TYPO.caption}>{fechaCorta(liq.fecha)}</Text>
            <Text style={TYPO.caption} numberOfLines={1}> · {formatKg(liq.pesoNeto)}</Text>
          </View>
        </View>

        <View style={styles.rowAmounts}>
          <Text style={[styles.rowKilos, { color: COLORS.navy }]}>{pesos(liq.importeFinal)}</Text>
          <View style={styles.rowTags}>
            {idComprobante ? (
              <Pressable
                onPress={() => onDescargar(idComprobante, liq.numero)}
                disabled={descargando}
                hitSlop={10}
                accessibilityLabel="Descargar liquidación en PDF"
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
              <Text style={styles.rowTipo}>Neto a cobrar</Text>
            )}
          </View>
        </View>
      </View>

      {abierto && (
        <View style={styles.detail}>
          <LiquidacionDetalle liq={liq} />
          {idComprobante && (
            <Pressable
              onPress={() => onDescargar(idComprobante, liq.numero)}
              disabled={descargando}
              style={({ pressed }) => [styles.pdfLink, pressed && { opacity: 0.7 }]}
            >
              {descargando ? (
                <ActivityIndicator size="small" color={COLORS.navy} />
              ) : (
                <Ionicons name="document-text-outline" size={16} color={COLORS.navy} />
              )}
              <Text style={styles.pdfLinkText}>{descargando ? 'Descargando…' : 'Ver liquidación en PDF'}</Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
};

type Vista = 'todos' | 'ingresos' | 'liquidado';

type ItemLista =
  | { tipo: 'movimiento'; mov: MovimientoCereal }
  | { tipo: 'entrada'; entrada: Entrada }
  | { tipo: 'liquidacion'; liq: Liquidacion };

/** Agrupa por mes, lo más reciente arriba */
const agruparPorMes = <T,>(items: T[], fecha: (item: T) => Date) => {
  const grupos: { title: string; data: T[] }[] = [];
  for (const item of items) {
    const title = tituloMes(fecha(item));
    const g = grupos[grupos.length - 1];
    if (g && g.title === title) g.data.push(item);
    else grupos.push({ title, data: [item] });
  }
  return grupos;
};

const DetailItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailItem}>
    <Text style={TYPO.overline}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

/* ---------- Pantalla ---------- */
export const CosechasScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ cosechas: CosechasParams }, 'cosechas'>>();
  const { cuentaSeleccionada } = useSujetoSeleccionado();
  const { data: resumen, loading: loadingResumen } = useCuenta(cuentaSeleccionada?.idCuenta);
  const cosechas = resumen?.cosechas ?? [];

  const [seleccion, setSeleccion] = useState<string | undefined>(
    route.params?.idCosecha ? claveCosecha(route.params.idCosecha, route.params.idSucursal) : undefined
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [vista, setVista] = useState<Vista>('todos');

  // Llega una cosecha desde Inicio
  useEffect(() => {
    if (route.params?.idCosecha) setSeleccion(claveCosecha(route.params.idCosecha, route.params.idSucursal));
  }, [route.params?.idCosecha, route.params?.idSucursal]);

  // Si la cosecha elegida no existe en la cuenta actual, tomar la primera
  useEffect(() => {
    if (cosechas.length && !cosechas.some((c) => claveCosecha(c.idCosecha, c.idSucursal) === seleccion)) {
      setSeleccion(claveCosecha(cosechas[0].idCosecha, cosechas[0].idSucursal));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cosechas]);

  const cosecha = cosechas.find((c) => claveCosecha(c.idCosecha, c.idSucursal) === seleccion);
  const { data, loading, error } = useMovimientosCereal(
    cuentaSeleccionada?.idCuenta,
    cosecha?.idCosecha,
    cosecha?.idSucursal,
    refreshKey
  );
  const { data: entradas, loading: loadingEntradas, error: errorEntradas } = useEntradasCereal(
    cuentaSeleccionada?.idCuenta,
    cosecha?.idCosecha,
    cosecha?.idSucursal,
    refreshKey
  );
  const {
    data: liquidaciones,
    loading: loadingLiquidaciones,
    error: errorLiquidaciones,
  } = useLiquidacionesCereal(cuentaSeleccionada?.idCuenta, cosecha?.idCosecha, cosecha?.idSucursal, refreshKey);
  const buscarEntrada = useMemo(() => indexarEntradas(entradas ?? []), [entradas]);
  const { descargandoId, descargar, visor } = useComprobantePdf(cuentaSeleccionada?.idCuenta);

  const movimientos = data ?? [];
  const totales = useMemo(() => {
    const ultimo = [...movimientos].sort((a, b) => a.orden - b.orden)[movimientos.length - 1];
    return {
      saldo: ultimo?.saldo ?? cosecha?.saldo ?? 0,
      ingresos: movimientos.reduce((a, m) => a + m.ingreso, 0),
      egresos: movimientos.reduce((a, m) => a + m.egreso, 0),
    };
  }, [movimientos, cosecha?.saldo]);

  // Movimiento de cta. cte. de cada entrada, para usar su idTransaccion en el PDF
  const movimientoDeEntrada = useMemo(() => {
    const porNumero = new Map<string, MovimientoCereal>();
    for (const m of movimientos) if (esEntrada(m)) porNumero.set(numeroRomaneo(m.idTransaccion), m);
    return (e: Entrada) => porNumero.get(numeroRomaneo(e.numero));
  }, [movimientos]);

  // Movimiento de cta. cte. de cada liquidación (por número), para el PDF
  const movimientoDeLiquidacion = useMemo(() => {
    const porNumero = new Map<string, MovimientoCereal>();
    for (const m of movimientos) {
      if (m.tipo.toUpperCase() === 'LIQUI' || m.idTransaccion.toUpperCase().startsWith('LIQUI;')) {
        porNumero.set(soloDigitos(m.idTransaccion), m);
        if (m.numeroComprobante) porNumero.set(soloDigitos(m.numeroComprobante), m);
      }
    }
    return (l: Liquidacion) => porNumero.get(soloDigitos(l.numero));
  }, [movimientos]);

  const listaLiquidaciones = liquidaciones ?? [];
  const totalesLiquidado = useMemo(
    () => ({
      kilos: listaLiquidaciones.reduce((a, l) => a + l.pesoNeto, 0),
      importe: listaLiquidaciones.reduce((a, l) => a + l.importeFinal, 0),
    }),
    [listaLiquidaciones]
  );

  const listaEntradas = entradas ?? [];
  const totalesEntradas = useMemo(
    () => ({
      neto: listaEntradas.reduce((a, e) => a + (e.pesoNetoFinal || e.pesoNeto), 0),
      mermas: listaEntradas.reduce((a, e) => a + e.mermas.reduce((x, m) => x + m.kilos, 0), 0),
    }),
    [listaEntradas]
  );

  const secciones = useMemo(() => {
    if (vista === 'liquidado') {
      const ordenadas = [...listaLiquidaciones].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      return agruparPorMes(ordenadas, (l) => l.fecha).map((g) => ({
        title: g.title,
        data: g.data.map((liq): ItemLista => ({ tipo: 'liquidacion', liq })),
      }));
    }
    if (vista === 'ingresos') {
      const ordenadas = [...listaEntradas].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      return agruparPorMes(ordenadas, (e) => e.fecha).map((g) => ({
        title: g.title,
        data: g.data.map((entrada): ItemLista => ({ tipo: 'entrada', entrada })),
      }));
    }
    const ordenados = [...movimientos].sort(
      (a, b) => b.fechaComprobante.getTime() - a.fechaComprobante.getTime() || b.orden - a.orden
    );
    return agruparPorMes(ordenados, (m) => m.fechaComprobante).map((g) => ({
      title: g.title,
      data: g.data.map((mov): ItemLista => ({ tipo: 'movimiento', mov })),
    }));
  }, [vista, movimientos, listaEntradas, listaLiquidaciones]);

  const sinCosechas = !loadingResumen && resumen && cosechas.length === 0;
  const estadoVista = {
    todos: { loading, error, cargado: !!data },
    ingresos: { loading: loadingEntradas, error: errorEntradas, cargado: !!entradas },
    liquidado: { loading: loadingLiquidaciones, error: errorLiquidaciones, cargado: !!liquidaciones },
  }[vista];
  const primeraCarga = (estadoVista.loading && !estadoVista.cargado) || (loadingResumen && !resumen);
  const errorVista = estadoVista.error;
  const cargandoVista = estadoVista.loading;

  const header = (
    <View>
      <HeaderTail />
      <Card style={styles.summary}>
        <Text style={TYPO.overline}>{cosecha?.nombre ? `Saldo · ${cosecha.nombre}` : 'Saldo en planta'}</Text>
        {primeraCarga ? (
          <Skeleton width="55%" height={32} style={{ marginTop: 6 }} />
        ) : (
          <Text style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>
            {kgConSigno(totales.saldo)}
          </Text>
        )}
        <View style={styles.summaryStats}>
          <Stat
            label="Ingresos"
            value={formatKg(totales.ingresos)}
            icon="arrow-down"
            color={COLORS.green}
            active={vista === 'ingresos'}
            onPress={() => setVista((v) => (v === 'ingresos' ? 'todos' : 'ingresos'))}
          />
          <View style={styles.statDivider} />
          <Stat label="Egresos" value={formatKg(totales.egresos)} icon="arrow-up" color={COLORS.amber} />
        </View>
      </Card>

      {cosechas.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {cosechas.map((c) => {
            const clave = claveCosecha(c.idCosecha, c.idSucursal);
            return (
              <Chip key={clave} label={c.nombre || c.idCosecha} active={clave === seleccion} onPress={() => setSeleccion(clave)} />
            );
          })}
        </ScrollView>
      )}

      {!sinCosechas && (
        <View style={styles.segmented}>
          {(
            [
              ['todos', 'Todos'],
              ['ingresos', entradas ? `Ingresos · ${entradas.length}` : 'Ingresos'],
              ['liquidado', liquidaciones ? `Liquidado · ${liquidaciones.length}` : 'Liquidado'],
            ] as [Vista, string][]
          ).map(([clave, label]) => (
            <Pressable
              key={clave}
              onPress={() => setVista(clave)}
              style={[styles.segment, vista === clave && styles.segmentActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: vista === clave }}
            >
              <Text style={[styles.segmentText, vista === clave && styles.segmentTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {vista === 'ingresos' && !primeraCarga && listaEntradas.length > 0 && (
        <View style={styles.ingresosResumen}>
          <Text style={TYPO.caption}>
            {listaEntradas.length} {listaEntradas.length === 1 ? 'entrada' : 'entradas'}
          </Text>
          <Text style={styles.ingresosResumenNeto}>Neto {formatKg(totalesEntradas.neto)}</Text>
          {totalesEntradas.mermas > 0 && (
            <Text style={styles.ingresosResumenMerma}>Mermas −{formatKg(totalesEntradas.mermas)}</Text>
          )}
        </View>
      )}

      {vista === 'liquidado' && !primeraCarga && listaLiquidaciones.length > 0 && (
        <View style={styles.ingresosResumen}>
          <Text style={TYPO.caption}>
            {listaLiquidaciones.length} {listaLiquidaciones.length === 1 ? 'liquidación' : 'liquidaciones'}
          </Text>
          <Text style={[styles.ingresosResumenNeto, { color: COLORS.textDark }]}>{formatKg(totalesLiquidado.kilos)}</Text>
          <Text style={[styles.ingresosResumenNeto, { color: COLORS.navy }]}>Neto {pesos(totalesLiquidado.importe)}</Text>
        </View>
      )}

      {primeraCarga && !sinCosechas && (
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
      {sinCosechas && (
        <View style={styles.inset}>
          <EmptyState icon="leaf-outline" title="Sin cosechas" message="No hay cosechas con saldo para esta cuenta." />
        </View>
      )}
      {errorVista && !cargandoVista && (
        <View style={styles.inset}>
          <EmptyState
            icon="alert-circle-outline"
            tone="error"
            title={
              vista === 'ingresos'
                ? 'No pudimos cargar las entradas'
                : vista === 'liquidado'
                  ? 'No pudimos cargar las liquidaciones'
                  : 'No pudimos cargar los movimientos'
            }
            message={errorVista}
          />
        </View>
      )}
      {vista === 'todos' && !loading && !error && data && movimientos.length === 0 && (
        <View style={styles.inset}>
          <EmptyState icon="receipt-outline" title="Sin movimientos" message="Esta cosecha todavía no tiene movimientos." />
        </View>
      )}
      {vista === 'ingresos' && !loadingEntradas && !errorEntradas && entradas && entradas.length === 0 && (
        <View style={styles.inset}>
          <EmptyState icon="arrow-down-circle-outline" title="Sin entradas" message="Esta cosecha todavía no tiene entradas." />
        </View>
      )}
      {vista === 'liquidado' && !loadingLiquidaciones && !errorLiquidaciones && liquidaciones && liquidaciones.length === 0 && (
        <View style={styles.inset}>
          <EmptyState icon="cash-outline" title="Sin liquidaciones" message="Esta cosecha todavía no tiene liquidaciones." />
        </View>
      )}
    </View>
  );

  return (
    <>
      <SectionList
        sections={primeraCarga || errorVista ? [] : secciones}
        keyExtractor={(item, i) =>
          item.tipo === 'movimiento'
            ? `m-${item.mov.idTransaccion}-${item.mov.orden}-${i}`
            : item.tipo === 'entrada'
              ? `e-${item.entrada.numero}-${i}`
              : `l-${item.liq.numero}-${i}`
        }
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
            {item.tipo === 'movimiento' ? (
              <MovimientoCerealRow
                mov={item.mov}
                entrada={esEntrada(item.mov) ? buscarEntrada(item.mov) : undefined}
                cargandoEntrada={esEntrada(item.mov) && loadingEntradas}
                descargando={descargandoId === item.mov.idTransaccion}
                onDescargar={(mov) => descargar(mov.idTransaccion, mov.tipo, mov.numeroComprobante)}
              />
            ) : item.tipo === 'liquidacion' ? (
              (() => {
                const idComprobante =
                  (item.liq.idTransaccion.includes(';') ? item.liq.idTransaccion : '') ||
                  movimientoDeLiquidacion(item.liq)?.idTransaccion ||
                  undefined;
                return (
                  <LiquidacionRow
                    liq={item.liq}
                    idComprobante={idComprobante}
                    descargando={!!idComprobante && descargandoId === idComprobante}
                    onDescargar={(id, numero) => descargar(id, 'LIQUI', numero)}
                  />
                );
              })()
            ) : (
              (() => {
                const idComprobante =
                  item.entrada.idTransaccion || movimientoDeEntrada(item.entrada)?.idTransaccion || undefined;
                return (
                  <EntradaRow
                    entrada={item.entrada}
                    idComprobante={idComprobante}
                    descargando={!!idComprobante && descargandoId === idComprobante}
                    onDescargar={(id, numero) => descargar(id, 'ENTRADA', numero)}
                  />
                );
              })()
            )}
            {index < section.data.length - 1 && <View style={styles.divider} />}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: SPACING.xxxl }}
        refreshControl={
          <RefreshControl
            refreshing={estadoVista.loading && estadoVista.cargado}
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

interface StatProps {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  active?: boolean;
  onPress?: () => void;
}

const Stat: React.FC<StatProps> = ({ label, value, icon, color, active, onPress }) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    style={({ pressed }) => [styles.stat, active && styles.statActive, pressed && { opacity: 0.7 }]}
    accessibilityRole={onPress ? 'button' : undefined}
  >
    <View style={styles.statLabelRow}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
      {onPress && <Ionicons name={active ? 'close' : 'chevron-forward'} size={12} color={COLORS.textMuted} />}
    </View>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  inset: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  summary: { marginHorizontal: SPACING.lg, padding: SPACING.xl, ...SHADOW.md },
  summaryAmount: { ...TYPO.amount, fontSize: 30, color: COLORS.textDark, marginTop: 4 },
  summaryStats: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stat: { flex: 1, borderRadius: RADIUS.sm, paddingVertical: 4, paddingHorizontal: 6, marginHorizontal: -6 },
  statActive: { backgroundColor: COLORS.greenSoft },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.sm },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 12, fontWeight: '700' },
  statValue: { ...TYPO.amount, fontSize: 14, color: COLORS.textDark, marginTop: 2 },

  segmented: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: 3,
    borderRadius: RADIUS.md,
    backgroundColor: '#e6eaf0',
  },
  segment: { flex: 1, paddingVertical: 8, borderRadius: RADIUS.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: COLORS.white, ...SHADOW.sm },
  segmentText: { fontSize: 13, fontWeight: '600', color: COLORS.textGray },
  segmentTextActive: { color: COLORS.navy, fontWeight: '800' },
  ingresosResumen: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginHorizontal: SPACING.lg + 4,
    marginTop: SPACING.md,
  },
  ingresosResumenNeto: { ...TYPO.amount, fontSize: 13, color: COLORS.green },
  ingresosResumenMerma: { ...TYPO.amount, fontSize: 13, color: COLORS.amber },
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
  rowKilos: { ...TYPO.amount, fontSize: 15 },
  rowTags: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  rowTipo: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
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
  detailValue: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginTop: 2 },
  entrada: { width: '100%' },
  entradaCargando: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, width: '100%' },
  pesos: { flexDirection: 'row', gap: SPACING.sm, marginTop: 6 },
  peso: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
  },
  pesoLabel: { fontSize: 11, color: COLORS.textGray, fontWeight: '600' },
  pesoValue: { ...TYPO.amount, fontSize: 13, color: COLORS.textDark, marginTop: 1 },
  mermas: { marginTop: SPACING.sm },
  mermaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  mermaLabel: { flex: 1, fontSize: 13, color: COLORS.textBody },
  mermaPct: { fontSize: 12, color: COLORS.textGray, width: 56, textAlign: 'right' },
  mermaKg: { ...TYPO.amount, fontSize: 13, color: COLORS.amber, width: 84, textAlign: 'right' },
  netoFinal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  netoFinalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  netoFinalValue: { ...TYPO.amount, fontSize: 16, color: COLORS.green },
  lineaImporte: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 3, gap: SPACING.md },
  lineaLabel: { flex: 1, fontSize: 13, color: COLORS.textBody },
  lineaValor: { ...TYPO.amount, fontSize: 13, color: COLORS.textDark },
  lineaFuerte: { fontWeight: '800', color: COLORS.textDark },
  datoRow: { flexDirection: 'row', paddingVertical: 3, gap: SPACING.md },
  datoLabel: { width: 104, fontSize: 13, color: COLORS.textGray },
  datoValue: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textDark },
  entradaObs: { ...TYPO.caption, fontStyle: 'italic', marginTop: SPACING.sm },
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
});
