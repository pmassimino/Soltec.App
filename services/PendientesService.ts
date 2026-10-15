// services/PendientesService.ts
import { BaseService } from './BaseService';
import { DetallePendiente, DocumentoPendiente } from './models';

// El backend serializa clases WCF: aceptamos camelCase y PascalCase por las dudas
const pick = (raw: any, key: string) => raw?.[key] ?? raw?.[key.charAt(0).toUpperCase() + key.slice(1)];

const toDetalle = (raw: any): DetallePendiente => ({
  idArticulo: String(pick(raw, 'id_Articulo') ?? '').trim(),
  descripcion: String(pick(raw, 'descripcion') ?? '').trim(),
  cantidad: Number(pick(raw, 'cantidad') ?? 0),
  cantidadPendiente: Number(pick(raw, 'cantidadPendiente') ?? 0),
});

const toRemito = (raw: any): DocumentoPendiente => {
  const letra = String(pick(raw, 'letra') ?? '').trim();
  const pe = String(pick(raw, 'pe') ?? 0).padStart(4, '0');
  const nro = String(pick(raw, 'numero') ?? 0).padStart(8, '0');
  return {
    id: String(pick(raw, 'id') ?? `${pe}-${nro}`),
    numero: `${letra ? `${letra} ` : ''}${pe}-${nro}`,
    fechaComprobante: new Date(pick(raw, 'fechaComprobante')),
    observaciones: String(pick(raw, 'observaciones') ?? '').trim(),
    detalle: ((pick(raw, 'detalle') as any[]) ?? []).map(toDetalle),
  };
};

const toFactura = (raw: any): DocumentoPendiente => {
  const letra = String(pick(raw, 'letra') ?? '').trim();
  const numero = String(pick(raw, 'numero') ?? pick(raw, 'comprobante') ?? '').trim();
  return {
    id: numero || String(pick(raw, 'comprobante') ?? ''),
    numero: `${letra && !numero.startsWith(letra) ? `${letra} ` : ''}${numero}`,
    fechaComprobante: new Date(pick(raw, 'fechaComprobante')),
    observaciones: String(pick(raw, 'observaciones') ?? '').trim(),
    total: Number(pick(raw, 'total') ?? 0),
    detalle: ((pick(raw, 'detalleFactura') as any[]) ?? []).map(toDetalle),
  };
};

export class PendientesService extends BaseService {
  /** Remitos pendientes de facturar. El backend usa por defecto el último año. */
  async remitos(idCuenta: string): Promise<DocumentoPendiente[]> {
    return this.listar(`/api/Remito/${encodeURIComponent(idCuenta)}/Pendientes`, toRemito);
  }

  /** Facturas con ítems pendientes. El backend usa por defecto los últimos 3 años. */
  async facturas(idCuenta: string): Promise<DocumentoPendiente[]> {
    return this.listar(`/api/Factura/${encodeURIComponent(idCuenta)}/Pendientes`, toFactura);
  }

  private async listar(endpoint: string, map: (raw: any) => DocumentoPendiente): Promise<DocumentoPendiente[]> {
    try {
      const response: any[] = await this.fetchAPI(endpoint);
      return (response ?? []).map(map);
    } catch (error) {
      throw new Error(`PendientesService Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}
