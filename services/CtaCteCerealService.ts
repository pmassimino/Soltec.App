// services/CtaCteCerealService.ts
import { BaseService } from './BaseService';
import { Boleto, Certificado, ConceptoLiquidacion, Entrada, Liquidacion, MovimientoCereal } from './models';

// El backend serializa clases WCF: aceptamos camelCase y PascalCase por las dudas
const pick = (raw: any, key: string) => raw?.[key] ?? raw?.[key.charAt(0).toUpperCase() + key.slice(1)];

const toMovimiento = (raw: any): MovimientoCereal => ({
  idTransaccion: String(pick(raw, 'id_Transaccion') ?? ''),
  orden: Number(pick(raw, 'orden') ?? 0),
  tipo: String(pick(raw, 'tipo') ?? '').trim(),
  concepto: String(pick(raw, 'concepto') ?? '').trim(),
  numeroComprobante: String(pick(raw, 'numeroComprobante') ?? '').trim(),
  fechaComprobante: new Date(pick(raw, 'fechaComprobante')),
  ingreso: Number(pick(raw, 'ingreso') ?? 0),
  egreso: Number(pick(raw, 'egreso') ?? 0),
  pesoNeto: Number(pick(raw, 'pesoNeto') ?? 0),
  saldo: Number(pick(raw, 'saldo') ?? 0),
  tieneComprobante: !!pick(raw, 'tieneComprobante'),
});

const texto = (raw: any, key: string) => String(pick(raw, key) ?? '').trim();
const numero = (raw: any, key: string) => Number(pick(raw, key) ?? 0);

const toEntrada = (raw: any): Entrada => ({
  idTransaccion: texto(raw, 'id_Transaccion'),
  numero: texto(raw, 'numero'),
  fecha: new Date(pick(raw, 'fecha')),
  cartaPorte: texto(raw, 'numeroCartaPorte'),
  ctg: numero(raw, 'ctg') ? String(pick(raw, 'ctg')) : '',
  planta: texto(raw, 'planta'),
  procedencia: texto(raw, 'procedencia'),
  transporte: texto(raw, 'transporte'),
  chofer: texto(raw, 'chofer'),
  patenteChasis: texto(raw, 'patenteC'),
  patenteAcoplado: texto(raw, 'patenteA'),
  observacion: texto(raw, 'observacion'),
  pesoBruto: numero(raw, 'pesoBruto'),
  pesoTara: numero(raw, 'pesoTara'),
  pesoNeto: numero(raw, 'pesoNeto'),
  pesoNetoFinal: numero(raw, 'pesoNetoFinal'),
  mermas: [
    { concepto: 'Humedad', porcentaje: numero(raw, 'porHumedad'), kilos: numero(raw, 'mermaHumedad') },
    { concepto: 'Zarandeo', porcentaje: numero(raw, 'porZaranda'), kilos: numero(raw, 'mermaZaranda') },
    { concepto: 'Volátil', porcentaje: numero(raw, 'porVolatil'), kilos: numero(raw, 'mermaVolatil') },
    { concepto: 'Calidad', porcentaje: numero(raw, 'porCalidad'), kilos: numero(raw, 'mermaCalidad') },
  ].filter((m) => m.kilos !== 0 || m.porcentaje !== 0),
});

const toConcepto = (raw: any): ConceptoLiquidacion => ({
  nombre: texto(raw, 'nombre') || texto(raw, 'codigo'),
  alicuota: numero(raw, 'alicuota'),
  importe: numero(raw, 'importe'),
});

const toLiquidacion = (raw: any): Liquidacion => ({
  idTransaccion: texto(raw, 'id_Transaccion'),
  numero: texto(raw, 'numero'),
  coe: texto(raw, 'coe'),
  fecha: new Date(pick(raw, 'fecha')),
  tipoOperacion: texto(raw, 'tipoOperacion'),
  numeroCertificado: texto(raw, 'numeroCertificado'),
  procedencia: texto(raw, 'procedencia'),
  pesoNeto: numero(raw, 'pesoNeto'),
  precio: numero(raw, 'precio'),
  importeBruto: numero(raw, 'importeBruto'),
  importeNeto: numero(raw, 'importeNeto'),
  importeIva: numero(raw, 'importeIva'),
  importeFinal: numero(raw, 'importeFinal'),
  deducciones: ((pick(raw, 'deducciones') as any[]) ?? []).map(toConcepto).filter((c) => c.importe !== 0),
  retenciones: ((pick(raw, 'retenciones') as any[]) ?? []).map(toConcepto).filter((c) => c.importe !== 0),
});

const toCertificado = (raw: any): Certificado => ({
  idTransaccion: texto(raw, 'id_Transaccion'),
  numero: texto(raw, 'numero'),
  coe: texto(raw, 'coe'),
  fecha: new Date(pick(raw, 'fecha')),
  tipo: texto(raw, 'tipo'),
  grado: numero(raw, 'grado'),
  factor: numero(raw, 'factor'),
  proteina: numero(raw, 'contProteico'),
  pesoBruto: numero(raw, 'pesoBruto'),
  pesoNeto: numero(raw, 'pesoNeto'),
  mermas: [
    { concepto: 'Secado', kilos: numero(raw, 'mermaSecado') },
    { concepto: 'Zarandeo', kilos: numero(raw, 'mermaZaranda') },
    { concepto: 'Volátil', kilos: numero(raw, 'mermaVolatil') },
    { concepto: 'Calidad', kilos: numero(raw, 'mermaCalidad') },
  ].filter((m) => m.kilos !== 0),
  gastos: [
    { concepto: 'Secado', importe: numero(raw, 'importeSecado') },
    { concepto: 'Zarandeo', importe: numero(raw, 'importeZaranda') },
    { concepto: 'Acarreo', importe: numero(raw, 'importeAcarreo') },
    { concepto: 'Flete', importe: numero(raw, 'importeFlete') },
    { concepto: 'Fumigación', importe: numero(raw, 'importeFumigada') },
    { concepto: 'Gastos generales', importe: numero(raw, 'importeGG') },
    { concepto: 'Análisis', importe: numero(raw, 'importeAnalisis') },
    { concepto: 'Sellado', importe: numero(raw, 'importeSellado') },
    { concepto: 'Otros', importe: numero(raw, 'importeOtros') },
    { concepto: 'IVA', importe: numero(raw, 'importeIva') },
  ].filter((g) => g.importe !== 0),
  total: numero(raw, 'total'),
  analisis: ((pick(raw, 'detalleAnalisis') as any[]) ?? []).map((a) => ({
    nombre: texto(a, 'nombre'),
    valor: numero(a, 'valor'),
    bonificacion: numero(a, 'bonificacion'),
    rebaja: numero(a, 'rebaja'),
  })),
  romaneos: ((pick(raw, 'detalleRomaneo') as any[]) ?? []).map((r) => ({
    cartaPorte: texto(r, 'numeroCPorte'),
    fecha: new Date(pick(r, 'fecha')),
    pesoBruto: numero(r, 'pesoBruto'),
    porHumedad: numero(r, 'porHumedad'),
    mermaHumedad: numero(r, 'mermaHumedad'),
    mermaZaranda: numero(r, 'mermaZaranda'),
  })),
});

const toBoleto = (raw: any): Boleto => ({
  idTransaccion: texto(raw, 'id_Transaccion'),
  numero: texto(raw, 'numero'),
  fecha: new Date(pick(raw, 'fecha')),
  fechaVencimiento: new Date(pick(raw, 'fechaVencimiento')),
  estado: texto(raw, 'estado'),
  aFijar: !!pick(raw, 'aFijar'),
  pendienteFijar: numero(raw, 'pendienteFijar'),
  pesoNeto: numero(raw, 'pesoNeto'),
  precio: numero(raw, 'precio'),
  observaciones: texto(raw, 'obs'),
});

export class CtaCteCerealService extends BaseService {
  /** Movimientos en kilos de una cosecha. El backend trae por defecto los últimos 10 años. */
  async movimientos(idCuenta: string, idCosecha: string, idSucursal = '001'): Promise<MovimientoCereal[]> {
    try {
      const query = `idCosecha=${encodeURIComponent(idCosecha)}&idSucursal=${encodeURIComponent(idSucursal)}`;
      const response: any[] = await this.fetchAPI(`/api/CtaCteCereal/${encodeURIComponent(idCuenta)}?${query}`);
      return (response ?? []).map(toMovimiento);
    } catch (error) {
      throw new Error(`CtaCteCerealService Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /** Entradas (romaneos) de una cosecha, con pesos, mermas y datos del transporte. */
  async entradas(idCuenta: string, idCosecha: string, idSucursal = '001'): Promise<Entrada[]> {
    try {
      const query = `idCosecha=${encodeURIComponent(idCosecha)}&idSucursal=${encodeURIComponent(idSucursal)}`;
      const response: any[] = await this.fetchAPI(`/api/Entradas/${encodeURIComponent(idCuenta)}?${query}`);
      return (response ?? []).map(toEntrada);
    } catch (error) {
      throw new Error(`CtaCteCerealService Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /** Liquidaciones de una cosecha, con deducciones y retenciones. */
  async liquidaciones(idCuenta: string, idCosecha: string, idSucursal = '001'): Promise<Liquidacion[]> {
    try {
      const query = `idCosecha=${encodeURIComponent(idCosecha)}&idSucursal=${encodeURIComponent(idSucursal)}`;
      const response: any[] = await this.fetchAPI(`/api/Liquidaciones/${encodeURIComponent(idCuenta)}?${query}`);
      return (response ?? []).map(toLiquidacion);
    } catch (error) {
      throw new Error(`CtaCteCerealService Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /** Certificados de depósito de una cosecha, con análisis, mermas, gastos y entradas incluidas. */
  async certificados(idCuenta: string, idCosecha: string, idSucursal = '001'): Promise<Certificado[]> {
    try {
      const query = `idCosecha=${encodeURIComponent(idCosecha)}&idSucursal=${encodeURIComponent(idSucursal)}`;
      const response: any[] = await this.fetchAPI(`/api/Certificados/${encodeURIComponent(idCuenta)}?${query}`);
      return (response ?? []).map(toCertificado);
    } catch (error) {
      throw new Error(`CtaCteCerealService Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /** Boletos de compraventa de una cosecha. */
  async boletos(idCuenta: string, idCosecha: string, idSucursal = '001'): Promise<Boleto[]> {
    try {
      const query = `idCosecha=${encodeURIComponent(idCosecha)}&idSucursal=${encodeURIComponent(idSucursal)}`;
      const response: any[] = await this.fetchAPI(`/api/Boletos/${encodeURIComponent(idCuenta)}?${query}`);
      return (response ?? []).map(toBoleto);
    } catch (error) {
      throw new Error(`CtaCteCerealService Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}
