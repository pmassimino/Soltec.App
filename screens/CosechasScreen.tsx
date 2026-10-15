import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useSujetoSeleccionado } from '../context/SujetoContext';
import { useCuenta } from '../hooks/CuentaHook';
import {
  useBoletosCereal,
  useCertificadosCereal,
  useEntradasCereal,
  useLiquidacionesCereal,
  useMovimientosCereal,
} from '../hooks/CosechaHook';
import { useComprobantePdf } from '../hooks/ComprobantePdfHook';
import { Boleto, Certificado, ConceptoLiquidacion, Entrada, Liquidacion, MovimientoCereal } from '../services/models';
import { tipoComprobante } from '../services/ComprobanteService';
import { COLORS, RADIUS, SHADOW, SPACING, TYPO } from '../constants/theme';
import { Card, Chip, EmptyState, HeaderTail, IconBadge, IconName, Skeleton } from '../components/ui';
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

/* ---------- Fila de certificado (vista Certificados) ---------- */
const decimal = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });

const CertificadoDetalle: React.FC<{ cert: Certificado }> = ({ cert }) => {
  const mermaTotal = cert.mermas.reduce((a, m) => a + m.kilos, 0);
  const calidad = (
    [
      ['Grado', cert.grado ? String(cert.grado) : ''],
      ['Factor', cert.factor ? decimal(cert.factor) : ''],
      ['Proteína', cert.proteina ? `${decimal(cert.proteina)}%` : ''],
    ] as [string, string][]
  ).filter(([, v]) => !!v);

  return (
    <View style={styles.entrada}>
      <Text style={TYPO.overline}>Kilos</Text>
      <View style={styles.pesos}>
        <View style={styles.peso}>
          <Text style={styles.pesoLabel}>Bruto</Text>
          <Text style={styles.pesoValue} numberOfLines={1} adjustsFontSizeToFit>
            {cert.pesoBruto.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.peso}>
          <Text style={styles.pesoLabel}>Mermas</Text>
          <Text style={[styles.pesoValue, { color: COLORS.amber }]} numberOfLines={1} adjustsFontSizeToFit>
            {mermaTotal ? `−${mermaTotal.toLocaleString('es-AR')}` : '0'}
          </Text>
        </View>
        <View style={styles.peso}>
          <Text style={styles.pesoLabel}>Neto</Text>
          <Text style={[styles.pesoValue, { color: COLORS.green }]} numberOfLines={1} adjustsFontSizeToFit>
            {cert.pesoNeto.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>

      {cert.mermas.length > 0 && (
        <View style={styles.mermas}>
          {cert.mermas.map((m) => (
            <View key={m.concepto} style={styles.mermaRow}>
              <Text style={styles.mermaLabel}>Merma {m.concepto.toLowerCase()}</Text>
              <Text style={styles.mermaKg}>−{formatKg(m.kilos)}</Text>
            </View>
          ))}
        </View>
      )}

      {(calidad.length > 0 || cert.analisis.length > 0) && (
        <>
          <Text style={[TYPO.overline, { marginTop: SPACING.md }]}>Calidad</Text>
          {calidad.length > 0 && (
            <View style={styles.calidadRow}>
              {calidad.map(([label, value]) => (
                <View key={label} style={styles.calidadItem}>
                  <Text style={styles.pesoLabel}>{label}</Text>
                  <Text style={styles.calidadValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}
          {cert.analisis.map((a, i) => (
            <View key={`${a.nombre}-${i}`} style={styles.mermaRow}>
              <Text style={styles.mermaLabel} numberOfLines={1}>{a.nombre}</Text>
              <Text style={styles.mermaPct}>{decimal(a.valor)}</Text>
              <Text
                style={[
                  styles.analisisAjuste,
                  { color: a.bonificacion ? COLORS.green : a.rebaja ? COLORS.amber : COLORS.textMuted },
                ]}
              >
                {a.bonificacion ? `+${decimal(a.bonificacion)}%` : a.rebaja ? `−${decimal(a.rebaja)}%` : '—'}
              </Text>
            </View>
          ))}
        </>
      )}

      {cert.gastos.length > 0 && (
        <>
          <Text style={[TYPO.overline, { marginTop: SPACING.md }]}>Gastos</Text>
          {cert.gastos.map((g) => (
            <LineaImporte key={g.concepto} label={g.concepto} value={g.importe} />
          ))}
          <View style={styles.netoFinal}>
            <Text style={styles.netoFinalLabel}>Total gastos</Text>
            <Text style={[styles.netoFinalValue, { color: COLORS.amber }]}>{pesos(cert.total)}</Text>
          </View>
        </>
      )}

      {cert.romaneos.length > 0 && (
        <>
          <Text style={[TYPO.overline, { marginTop: SPACING.md }]}>
            Entradas incluidas · {cert.romaneos.length}
          </Text>
          {cert.romaneos.map((r, i) => (
            <View key={`${r.cartaPorte}-${i}`} style={styles.romaneoRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.datoValue} numberOfLines={1}>{r.cartaPorte ? `CP ${r.cartaPorte}` : 'Entrada'}</Text>
                <Text style={styles.romaneoMeta}>
                  {fechaCorta(r.fecha)}
                  {r.porHumedad ? ` · Hum. ${decimal(r.porHumedad)}%` : ''}
                </Text>
              </View>
              <Text style={styles.romaneoKg}>{formatKg(r.pesoBruto)}</Text>
            </View>
          ))}
        </>
      )}

      {!!cert.coe && (
        <View style={[styles.datoRow, { marginTop: SPACING.sm }]}>
          <Text style={styles.datoLabel}>COE</Text>
          <Text style={styles.datoValue}>{cert.coe}</Text>
        </View>
      )}
    </View>
  );
};

interface CertificadoRowProps {
  cert: Certificado;
  idComprobante?: string;
  descargando: boolean;
  onDescargar: (idTransaccion: string, numero: string) => void;
}

const CertificadoRow: React.FC<CertificadoRowProps> = ({ cert, idComprobante, descargando, onDescargar }) => {
  const [abierto, setAbierto] = useState(false);

  return (
    <Pressable onPress={() => setAbierto((v) => !v)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
      <View style={styles.rowTop}>
        <View style={[styles.rowIcon, { backgroundColor: COLORS.goldSoft }]}>
          <Ionicons name="ribbon-outline" size={16} color={COLORS.amber} />
        </View>

        <View style={styles.rowBody}>
          <Text style={TYPO.bodyStrong} numberOfLines={1}>
            Certificado {cert.numero || '—'}
          </Text>
          <View style={styles.rowMeta}>
            <Text style={TYPO.caption}>{fechaCorta(cert.fecha)}</Text>
            {!!cert.grado && <Text style={TYPO.caption}> · Grado {cert.grado}</Text>}
          </View>
        </View>

        <View style={styles.rowAmounts}>
          <Text style={[styles.rowKilos, { color: COLORS.textDark }]}>{formatKg(cert.pesoNeto)}</Text>
          <View style={styles.rowTags}>
            {idComprobante ? (
              <Pressable
                onPress={() => onDescargar(idComprobante, cert.numero)}
                disabled={descargando}
                hitSlop={10}
                accessibilityLabel="Descargar certificado en PDF"
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
              <Text style={styles.rowTipo}>Neto certificado</Text>
            )}
          </View>
        </View>
      </View>

      {abierto && (
        <View style={styles.detail}>
          <CertificadoDetalle cert={cert} />
          {idComprobante && (
            <Pressable
              onPress={() => onDescargar(idComprobante, cert.numero)}
              disabled={descargando}
              style={({ pressed }) => [styles.pdfLink, pressed && { opacity: 0.7 }]}
            >
              {descargando ? (
                <ActivityIndicator size="small" color={COLORS.navy} />
              ) : (
                <Ionicons name="document-text-outline" size={16} color={COLORS.navy} />
              )}
              <Text style={styles.pdfLinkText}>{descargando ? 'Descargando…' : 'Ver certificado en PDF'}</Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
};

/* ---------- Fila de boleto (vista Boletos) ---------- */
interface BoletoRowProps {
  bol: Boleto;
  idComprobante?: string;
  descargando: boolean;
  onDescargar: (idTransaccion: string, numero: string) => void;
}

const BoletoRow: React.FC<BoletoRowProps> = ({ bol, idComprobante, descargando, onDescargar }) => {
  const [abierto, setAbierto] = useState(false);
  const datos = (
    [
      ['Estado', bol.estado],
      ['Vencimiento', bol.fechaVencimiento.getFullYear() > 1900 ? fechaCorta(bol.fechaVencimiento) : ''],
      ['Observaciones', bol.observaciones],
    ] as [string, string][]
  ).filter(([, v]) => !!v);

  return (
    <Pressable onPress={() => setAbierto((v) => !v)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
      <View style={styles.rowTop}>
        <View style={[styles.rowIcon, { backgroundColor: COLORS.bg }]}>
          <Ionicons name="pricetag-outline" size={16} color={COLORS.navy} />
        </View>

        <View style={styles.rowBody}>
          <Text style={TYPO.bodyStrong} numberOfLines={1}>
            Boleto {bol.numero || '—'}
          </Text>
          <View style={styles.rowMeta}>
            <Text style={TYPO.caption}>{fechaCorta(bol.fecha)}</Text>
            {!!bol.estado && <Text style={TYPO.caption} numberOfLines={1}> · {bol.estado}</Text>}
          </View>
        </View>

        <View style={styles.rowAmounts}>
          <Text style={[styles.rowKilos, { color: COLORS.textDark }]}>{formatKg(bol.pesoNeto)}</Text>
          <View style={styles.rowTags}>
            {bol.aFijar && <Text style={styles.aFijarTag}>A fijar</Text>}
            {idComprobante && (
              <Pressable
                onPress={() => onDescargar(idComprobante, bol.numero)}
                disabled={descargando}
                hitSlop={10}
                accessibilityLabel="Descargar boleto en PDF"
                style={({ pressed }) => [styles.pdfChip, pressed && { opacity: 0.6 }]}
              >
                {descargando ? (
                  <ActivityIndicator size={10} color={COLORS.navy} />
                ) : (
                  <Ionicons name="download-outline" size={11} color={COLORS.navy} />
                )}
                <Text style={styles.pdfChipText}>PDF</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {abierto && (
        <View style={styles.detail}>
          <View style={styles.entrada}>
            <View style={styles.pesos}>
              <View style={styles.peso}>
                <Text style={styles.pesoLabel}>Kilos</Text>
                <Text style={styles.pesoValue} numberOfLines={1} adjustsFontSizeToFit>
                  {bol.pesoNeto.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={styles.peso}>
                <Text style={styles.pesoLabel}>Precio</Text>
                <Text style={styles.pesoValue} numberOfLines={1} adjustsFontSizeToFit>
                  {bol.precio ? formatMoney(bol.precio) : bol.aFijar ? 'A fijar' : '—'}
                </Text>
              </View>
              {bol.aFijar && (
                <View style={styles.peso}>
                  <Text style={styles.pesoLabel}>Pend. fijar</Text>
                  <Text style={[styles.pesoValue, { color: COLORS.amber }]} numberOfLines={1} adjustsFontSizeToFit>
                    {bol.pendienteFijar.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              )}
            </View>

            {datos.map(([label, value], i) => (
              <View key={label} style={[styles.datoRow, i === 0 && { marginTop: SPACING.sm }]}>
                <Text style={styles.datoLabel}>{label}</Text>
                <Text style={styles.datoValue} numberOfLines={3}>{value}</Text>
              </View>
            ))}
          </View>

          {idComprobante && (
            <Pressable
              onPress={() => onDescargar(idComprobante, bol.numero)}
              disabled={descargando}
              style={({ pressed }) => [styles.pdfLink, pressed && { opacity: 0.7 }]}
            >
              {descargando ? (
                <ActivityIndicator size="small" color={COLORS.navy} />
              ) : (
                <Ionicons name="document-text-outline" size={16} color={COLORS.navy} />
              )}
              <Text style={styles.pdfLinkText}>{descargando ? 'Descargando…' : 'Ver boleto en PDF'}</Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
};

type Vista = 'todos' | 'ingresos' | 'certificados' | 'boletos' | 'liquidado';

type TipoComprobanteCereal = 'LIQUI' | 'CERTI' | 'AUTORIZACION';

type VistaDetalle = Exclude<Vista, 'todos'>;

interface ConfigDetalle {
  titulo: string;
  icon: IconName;
  color: string;
  bg: string;
  error: string;
  vacio: { icon: IconName; titulo: string; mensaje: string };
}

const DETALLE: Record<VistaDetalle, ConfigDetalle> = {
  ingresos: {
    titulo: 'Ingresos',
    icon: 'arrow-down',
    color: COLORS.green,
    bg: COLORS.greenSoft,
    error: 'No pudimos cargar las entradas',
    vacio: { icon: 'arrow-down-circle-outline', titulo: 'Sin entradas', mensaje: 'Esta cosecha todavía no tiene entradas.' },
  },
  certificados: {
    titulo: 'Certificados',
    icon: 'ribbon-outline',
    color: COLORS.amber,
    bg: COLORS.goldSoft,
    error: 'No pudimos cargar los certificados',
    vacio: { icon: 'ribbon-outline', titulo: 'Sin certificados', mensaje: 'Esta cosecha todavía no tiene certificados.' },
  },
  boletos: {
    titulo: 'Boletos',
    icon: 'pricetag-outline',
    color: COLORS.navy,
    bg: COLORS.bg,
    error: 'No pudimos cargar los boletos',
    vacio: { icon: 'pricetag-outline', titulo: 'Sin boletos', mensaje: 'Esta cosecha todavía no tiene boletos.' },
  },
  liquidado: {
    titulo: 'Liquidado',
    icon: 'cash-outline',
    color: COLORS.blue,
    bg: COLORS.blueSoft,
    error: 'No pudimos cargar las liquidaciones',
    vacio: { icon: 'cash-outline', titulo: 'Sin liquidaciones', mensaje: 'Esta cosecha todavía no tiene liquidaciones.' },
  },
};

/* ---------- Tarjeta de resumen por tipo ---------- */
interface TarjetaProps {
  config: ConfigDetalle;
  cantidad?: number;
  valor?: string;
  extra?: string;
  onPress: () => void;
}

const TarjetaResumen: React.FC<TarjetaProps> = ({ config, cantidad, valor, extra, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.tile, pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }]}
    accessibilityRole="button"
    accessibilityLabel={`Ver ${config.titulo.toLowerCase()}`}
  >
    <View style={styles.tileTop}>
      <IconBadge name={config.icon} color={config.color} bg={config.bg} size={34} />
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </View>
    <Text style={styles.tileLabel}>
      {config.titulo}
      {cantidad !== undefined && <Text style={styles.tileCount}> · {cantidad}</Text>}
    </Text>
    {valor === undefined ? (
      <Skeleton width="70%" height={18} style={{ marginTop: 4 }} />
    ) : (
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>{valor}</Text>
    )}
    {!!extra && <Text style={styles.tileExtra} numberOfLines={1}>{extra}</Text>}
  </Pressable>
);

type ItemLista =
  | { tipo: 'movimiento'; mov: MovimientoCereal }
  | { tipo: 'entrada'; entrada: Entrada }
  | { tipo: 'certificado'; cert: Certificado }
  | { tipo: 'boleto'; bol: Boleto }
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

  // Llega una cosecha desde Inicio: se muestra su resumen
  useEffect(() => {
    if (route.params?.idCosecha) {
      setSeleccion(claveCosecha(route.params.idCosecha, route.params.idSucursal));
      setVista('todos');
    }
  }, [route.params?.idCosecha, route.params?.idSucursal]);

  // En un detalle, el botón atrás de Android vuelve al resumen de la cosecha
  useFocusEffect(
    useCallback(() => {
      if (vista === 'todos') return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        setVista('todos');
        return true;
      });
      return () => sub.remove();
    }, [vista])
  );

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
  const {
    data: certificados,
    loading: loadingCertificados,
    error: errorCertificados,
  } = useCertificadosCereal(cuentaSeleccionada?.idCuenta, cosecha?.idCosecha, cosecha?.idSucursal, refreshKey);
  const {
    data: boletos,
    loading: loadingBoletos,
    error: errorBoletos,
  } = useBoletosCereal(cuentaSeleccionada?.idCuenta, cosecha?.idCosecha, cosecha?.idSucursal, refreshKey);
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

  // Movimiento de cta. cte. de cada liquidación o certificado (por número), para el PDF
  const movimientoPorNumero = useMemo(() => {
    const indices: Record<string, Map<string, MovimientoCereal>> = {
      LIQUI: new Map(),
      CERTI: new Map(),
      AUTORIZACION: new Map(),
    };
    for (const m of movimientos) {
      const tipo = (m.idTransaccion.split(';')[0] || m.tipo).toUpperCase();
      const indice = indices[tipo] ?? indices[m.tipo.toUpperCase()];
      if (!indice) continue;
      indice.set(soloDigitos(m.idTransaccion), m);
      if (m.numeroComprobante) indice.set(soloDigitos(m.numeroComprobante), m);
    }
    return (tipo: TipoComprobanteCereal, numero: string) => indices[tipo].get(soloDigitos(numero));
  }, [movimientos]);
  const idParaPdf = (idTransaccion: string, tipo: TipoComprobanteCereal, numero: string) =>
    (idTransaccion.includes(';') ? idTransaccion : '') || movimientoPorNumero(tipo, numero)?.idTransaccion || undefined;

  const listaBoletos = boletos ?? [];
  const totalesBoletos = useMemo(
    () => ({
      kilos: listaBoletos.reduce((a, b) => a + b.pesoNeto, 0),
      aFijar: listaBoletos.reduce((a, b) => a + (b.aFijar ? b.pendienteFijar : 0), 0),
    }),
    [listaBoletos]
  );

  const listaCertificados = certificados ?? [];
  const totalesCertificados = useMemo(
    () => ({
      kilos: listaCertificados.reduce((a, c) => a + c.pesoNeto, 0),
      gastos: listaCertificados.reduce((a, c) => a + c.total, 0),
    }),
    [listaCertificados]
  );

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
    if (vista === 'boletos') {
      const ordenados = [...listaBoletos].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      return agruparPorMes(ordenados, (b) => b.fecha).map((g) => ({
        title: g.title,
        data: g.data.map((bol): ItemLista => ({ tipo: 'boleto', bol })),
      }));
    }
    if (vista === 'certificados') {
      const ordenados = [...listaCertificados].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      return agruparPorMes(ordenados, (c) => c.fecha).map((g) => ({
        title: g.title,
        data: g.data.map((cert): ItemLista => ({ tipo: 'certificado', cert })),
      }));
    }
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
  }, [vista, movimientos, listaEntradas, listaCertificados, listaBoletos, listaLiquidaciones]);

  const sinCosechas = !loadingResumen && resumen && cosechas.length === 0;
  const estadoVista = {
    todos: { loading, error, cargado: !!data },
    ingresos: { loading: loadingEntradas, error: errorEntradas, cargado: !!entradas },
    certificados: { loading: loadingCertificados, error: errorCertificados, cargado: !!certificados },
    boletos: { loading: loadingBoletos, error: errorBoletos, cargado: !!boletos },
    liquidado: { loading: loadingLiquidaciones, error: errorLiquidaciones, cargado: !!liquidaciones },
  }[vista];
  const primeraCarga = (estadoVista.loading && !estadoVista.cargado) || (loadingResumen && !resumen);
  const errorVista = estadoVista.error;
  const cargandoVista = estadoVista.loading;

  const cantidadVista = {
    todos: movimientos.length,
    ingresos: listaEntradas.length,
    certificados: listaCertificados.length,
    boletos: listaBoletos.length,
    liquidado: listaLiquidaciones.length,
  }[vista];

  const estados = (
    <>
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
      {errorVista && !cargandoVista && (
        <View style={styles.inset}>
          <EmptyState
            icon="alert-circle-outline"
            tone="error"
            title={vista === 'todos' ? 'No pudimos cargar los movimientos' : DETALLE[vista].error}
            message={errorVista}
          />
        </View>
      )}
      {!cargandoVista && !errorVista && estadoVista.cargado && cantidadVista === 0 && (
        <View style={styles.inset}>
          {vista === 'todos' ? (
            <EmptyState icon="receipt-outline" title="Sin movimientos" message="Esta cosecha todavía no tiene movimientos." />
          ) : (
            <EmptyState
              icon={DETALLE[vista].vacio.icon}
              title={DETALLE[vista].vacio.titulo}
              message={DETALLE[vista].vacio.mensaje}
            />
          )}
        </View>
      )}
    </>
  );

  // Resumen del tipo elegido: [etiqueta, valor, color]
  const statsDetalle: Record<VistaDetalle, [string, string, string][]> = {
    ingresos: [
      ['Entradas', String(listaEntradas.length), COLORS.textGray],
      ['Neto', formatKg(totalesEntradas.neto), COLORS.green],
      ['Mermas', `−${formatKg(totalesEntradas.mermas)}`, COLORS.amber],
    ],
    certificados: [
      ['Certificados', String(listaCertificados.length), COLORS.textGray],
      ['Neto', formatKg(totalesCertificados.kilos), COLORS.textDark],
      ['Gastos', pesos(totalesCertificados.gastos), COLORS.amber],
    ],
    boletos: [
      ['Boletos', String(listaBoletos.length), COLORS.textGray],
      ['Kilos', formatKg(totalesBoletos.kilos), COLORS.textDark],
      ['A fijar', formatKg(totalesBoletos.aFijar), COLORS.amber],
    ],
    liquidado: [
      ['Liquidaciones', String(listaLiquidaciones.length), COLORS.textGray],
      ['Kilos', formatKg(totalesLiquidado.kilos), COLORS.textDark],
      ['Neto', pesos(totalesLiquidado.importe), COLORS.navy],
    ],
  };

  const header =
    vista === 'todos' ? (
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
            <Stat label="Ingresos" value={formatKg(totales.ingresos)} icon="arrow-down" color={COLORS.green} />
            <View style={styles.statDivider} />
            <Stat label="Egresos" value={formatKg(totales.egresos)} icon="arrow-up" color={COLORS.amber} />
          </View>
        </Card>

        {cosechas.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {cosechas.map((c) => {
              const clave = claveCosecha(c.idCosecha, c.idSucursal);
              return (
                <Chip
                  key={clave}
                  label={c.nombre || c.idCosecha}
                  active={clave === seleccion}
                  onPress={() => setSeleccion(clave)}
                />
              );
            })}
          </ScrollView>
        )}

        {!sinCosechas && (
          <View style={styles.tiles}>
            <TarjetaResumen
              config={DETALLE.ingresos}
              cantidad={entradas?.length}
              valor={entradas ? formatKg(totalesEntradas.neto) : undefined}
              extra={totalesEntradas.mermas > 0 ? `Mermas −${formatKg(totalesEntradas.mermas)}` : undefined}
              onPress={() => setVista('ingresos')}
            />
            <TarjetaResumen
              config={DETALLE.certificados}
              cantidad={certificados?.length}
              valor={certificados ? formatKg(totalesCertificados.kilos) : undefined}
              extra={totalesCertificados.gastos > 0 ? `Gastos ${pesos(totalesCertificados.gastos)}` : undefined}
              onPress={() => setVista('certificados')}
            />
            <TarjetaResumen
              config={DETALLE.boletos}
              cantidad={boletos?.length}
              valor={boletos ? formatKg(totalesBoletos.kilos) : undefined}
              extra={totalesBoletos.aFijar > 0 ? `A fijar ${formatKg(totalesBoletos.aFijar)}` : undefined}
              onPress={() => setVista('boletos')}
            />
            <TarjetaResumen
              config={DETALLE.liquidado}
              cantidad={liquidaciones?.length}
              valor={liquidaciones ? pesos(totalesLiquidado.importe) : undefined}
              extra={totalesLiquidado.kilos > 0 ? formatKg(totalesLiquidado.kilos) : undefined}
              onPress={() => setVista('liquidado')}
            />
          </View>
        )}

        {sinCosechas ? (
          <View style={styles.inset}>
            <EmptyState icon="leaf-outline" title="Sin cosechas" message="No hay cosechas con saldo para esta cuenta." />
          </View>
        ) : (
          <Text style={styles.sectionTitle}>Movimientos</Text>
        )}
        {estados}
      </View>
    ) : (
      <View>
        <HeaderTail />
        <Card style={styles.summary}>
          <View style={styles.detalleTop}>
            <Pressable
              onPress={() => setVista('todos')}
              hitSlop={10}
              style={styles.backButton}
              accessibilityLabel="Volver al resumen de la cosecha"
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.navy} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={TYPO.h2}>{DETALLE[vista].titulo}</Text>
              <Text style={TYPO.caption} numberOfLines={1}>{cosecha?.nombre ?? ''}</Text>
            </View>
            <IconBadge name={DETALLE[vista].icon} color={DETALLE[vista].color} bg={DETALLE[vista].bg} size={40} />
          </View>
          <View style={styles.summaryStats}>
            {statsDetalle[vista].map(([label, value, color], i) => (
              <React.Fragment key={label}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.stat}>
                  <Text style={[styles.statLabel, { color: COLORS.textGray }]}>{label}</Text>
                  {primeraCarga ? (
                    <Skeleton width="80%" height={14} style={{ marginTop: 4 }} />
                  ) : (
                    <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
                      {value}
                    </Text>
                  )}
                </View>
              </React.Fragment>
            ))}
          </View>
        </Card>
        {estados}
      </View>
    );

  return (
    <>
      <SectionList
        key={vista}
        sections={primeraCarga || errorVista ? [] : secciones}
        keyExtractor={(item, i) =>
          item.tipo === 'movimiento'
            ? `m-${item.mov.idTransaccion}-${item.mov.orden}-${i}`
            : item.tipo === 'entrada'
              ? `e-${item.entrada.numero}-${i}`
              : item.tipo === 'certificado'
                ? `c-${item.cert.numero}-${i}`
                : item.tipo === 'boleto'
                  ? `b-${item.bol.numero}-${i}`
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
            ) : item.tipo === 'certificado' ? (
              (() => {
                const idComprobante = idParaPdf(item.cert.idTransaccion, 'CERTI', item.cert.numero);
                return (
                  <CertificadoRow
                    cert={item.cert}
                    idComprobante={idComprobante}
                    descargando={!!idComprobante && descargandoId === idComprobante}
                    onDescargar={(id, numero) => descargar(id, 'CERTI', numero)}
                  />
                );
              })()
            ) : item.tipo === 'boleto' ? (
              (() => {
                const idComprobante = idParaPdf(item.bol.idTransaccion, 'AUTORIZACION', item.bol.numero);
                return (
                  <BoletoRow
                    bol={item.bol}
                    idComprobante={idComprobante}
                    descargando={!!idComprobante && descargandoId === idComprobante}
                    onDescargar={(id, numero) => descargar(id, 'AUTORIZACION', numero)}
                  />
                );
              })()
            ) : item.tipo === 'liquidacion' ? (
              (() => {
                const idComprobante = idParaPdf(item.liq.idTransaccion, 'LIQUI', item.liq.numero);
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
}

const Stat: React.FC<StatProps> = ({ label, value, icon, color }) => (
  <View style={styles.stat}>
    <View style={styles.statLabelRow}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  </View>
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
  stat: { flex: 1 },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.sm },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 12, fontWeight: '700' },
  statValue: { ...TYPO.amount, fontSize: 14, color: COLORS.textDark, marginTop: 2 },

  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOW.sm,
  },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  tileLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textBody },
  tileCount: { fontWeight: '600', color: COLORS.textMuted },
  tileValue: { ...TYPO.amount, fontSize: 17, color: COLORS.textDark, marginTop: 2 },
  tileExtra: { fontSize: 11, fontWeight: '600', color: COLORS.textGray, marginTop: 2 },
  sectionTitle: { ...TYPO.h2, marginHorizontal: SPACING.lg, marginTop: SPACING.xxl },
  detalleTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  aFijarTag: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.amber,
    backgroundColor: COLORS.amberSoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  calidadRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: 6, marginBottom: 4 },
  calidadItem: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
  },
  calidadValue: { ...TYPO.amount, fontSize: 13, color: COLORS.textDark, marginTop: 1 },
  analisisAjuste: { ...TYPO.amount, fontSize: 12, width: 64, textAlign: 'right' },
  romaneoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  romaneoMeta: { fontSize: 12, color: COLORS.textGray, marginTop: 1 },
  romaneoKg: { ...TYPO.amount, fontSize: 13, color: COLORS.textDark },
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
