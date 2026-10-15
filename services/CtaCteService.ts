// services/CtaCteService.ts
import { BaseService } from './BaseService';
import { Movimiento } from './models';

// El backend serializa clases WCF: aceptamos camelCase y PascalCase por las dudas
const pick = (raw: any, key: string) => raw[key] ?? raw[key.charAt(0).toUpperCase() + key.slice(1)];

const toFechaApi = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const toMovimiento = (raw: any): Movimiento => ({
  idTransaccion: String(pick(raw, 'id_Transaccion') ?? ''),
  orden: Number(pick(raw, 'orden') ?? 0),
  tipo: pick(raw, 'tipo') ?? '',
  concepto: (pick(raw, 'concepto') ?? '').trim(),
  numeroComprobante: (pick(raw, 'numeroComprobante') ?? '').trim(),
  fechaComprobante: new Date(pick(raw, 'fechaComprobante')),
  fechaVencimiento: new Date(pick(raw, 'fechaVencimiento')),
  debe: Number(pick(raw, 'debe') ?? 0),
  haber: Number(pick(raw, 'haber') ?? 0),
  saldo: Number(pick(raw, 'saldo') ?? 0),
  saldoVencido: Number(pick(raw, 'saldoVencido') ?? 0),
  vencido: !!pick(raw, 'vencido'),
  tieneComprobante: !!pick(raw, 'tieneComprobante'),
  idDivisa: Number(pick(raw, 'id_Divisa') ?? 0),
});

export class CtaCteService extends BaseService {
  async movimientos(
    idCuenta: string,
    idSubdiario: string,
    desde: Date,
    hasta: Date,
    idDivisa = 0
  ): Promise<Movimiento[]> {
    try {
      const query =
        `idSubdiario=${encodeURIComponent(idSubdiario)}` +
        `&fecha=${toFechaApi(desde)}&fechaHasta=${toFechaApi(hasta)}&idDivisa=${idDivisa}`;
      const response: any[] = await this.fetchAPI(`/api/CtaCte/${encodeURIComponent(idCuenta)}?${query}`);
      return (response ?? []).map(toMovimiento);
    } catch (error) {
      throw new Error(`CtaCteService Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}
