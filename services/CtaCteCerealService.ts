// services/CtaCteCerealService.ts
import { BaseService } from './BaseService';
import { ConceptoLiquidacion, Entrada, Liquidacion, MovimientoCereal } from './models';

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
}
