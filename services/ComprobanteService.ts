// services/ComprobanteService.ts
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { BaseService } from './BaseService';

// El backend arma idTransaccion como "Tipo;sucursal;id;numero;usuario" (TransactionHelper.GenerateTransaction).
// El tipo define qué endpoint genera el PDF. `tipo` (FACTU, ASIENTO, ...) se usa como respaldo.
interface TipoComprobante {
  endpoint: string;
  nombre: string;
}

const TIPOS: Record<string, TipoComprobante> = {
  factura: { endpoint: 'FacturaPdf', nombre: 'Factura' },
  factu: { endpoint: 'FacturaPdf', nombre: 'Factura' },
  asiento: { endpoint: 'AsientoPdf', nombre: 'Recibo' },
  liqui: { endpoint: 'LiquidacionPdf', nombre: 'Liquidación' },
  certi: { endpoint: 'CertificadoPdf', nombre: 'Certificado' },
  entrada: { endpoint: 'EntradaPdf', nombre: 'Entrada' },
  autorizacion: { endpoint: 'AutorizacionPdf', nombre: 'Autorización' },
};

/** Devuelve el tipo de comprobante descargable, o null si no tiene PDF. */
export const tipoComprobante = (idTransaccion: string, tipo?: string): TipoComprobante | null =>
  TIPOS[idTransaccion.split(';')[0]?.trim().toLowerCase() ?? ''] ??
  TIPOS[(tipo ?? '').trim().toLowerCase()] ??
  null;

const nombreArchivo = (base: string) => `${base.replace(/[^A-Za-z0-9_-]+/g, '_') || 'comprobante'}.pdf`;

export interface PdfDescargado {
  uri: string;
  base64: string;
  titulo: string;
}

export class ComprobanteService extends BaseService {
  /** Descarga el PDF del comprobante (GET /api/comprobante/{Tipo}Pdf/{idTransaccion}?idCuenta=). */
  async descargarPdf(
    idTransaccion: string,
    tipo: string,
    idCuenta: string,
    nombre: string
  ): Promise<PdfDescargado | null> {
    const comprobante = tipoComprobante(idTransaccion, tipo);
    if (!comprobante) throw new Error('Este movimiento no tiene un comprobante para descargar.');

    const url =
      `${this.baseURL}/api/comprobante/${comprobante.endpoint}/${encodeURIComponent(idTransaccion)}` +
      `?idCuenta=${encodeURIComponent(idCuenta)}`;
    return this.descargar(url, nombre, `${comprobante.nombre} ${nombre}`.trim());
  }

  /**
   * Descarga el resumen de cuenta corriente en PDF (GET /api/CtaCte/{idCuenta}/PDF?idSubdiario=),
   * por defecto con los movimientos de los últimos 60 días.
   */
  async descargarResumenCtaCte(
    idCuenta: string,
    idSubdiario: string,
    idDivisa: number,
    nombreSubdiario: string
  ): Promise<PdfDescargado | null> {
    const url =
      `${this.baseURL}/api/CtaCte/${encodeURIComponent(idCuenta)}/PDF` +
      `?idSubdiario=${encodeURIComponent(idSubdiario)}&idDivisa=${idDivisa}`;
    return this.descargar(url, `resumen-${idCuenta}-${idSubdiario}`, `Resumen ${nombreSubdiario}`.trim());
  }

  /**
   * En el teléfono guarda el PDF en caché y lo devuelve para mostrarlo en el visor;
   * en web lo abre directamente en una pestaña nueva y devuelve null.
   */
  private async descargar(url: string, nombre: string, titulo: string): Promise<PdfDescargado | null> {
    const token = await this.getToken();
    const headers = { Authorization: `Bearer ${token}` };

    if (Platform.OS === 'web') {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(this.mensajeError(response.status));
      const blobUrl = URL.createObjectURL(await response.blob());
      window.open(blobUrl, '_blank');
      return null;
    }

    let archivo: File;
    try {
      archivo = await File.downloadFileAsync(url, new File(Paths.cache, nombreArchivo(nombre)), {
        headers,
        idempotent: true,
      });
    } catch (error) {
      const status = Number(/\b(\d{3})\b/.exec(error instanceof Error ? error.message : '')?.[1]);
      throw new Error(this.mensajeError(status));
    }

    return {
      uri: archivo.uri,
      base64: await archivo.base64(),
      titulo,
    };
  }

  /** Abre el menú del sistema para guardar o enviar el PDF ya descargado. */
  async compartirPdf(pdf: PdfDescargado): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Este dispositivo no permite compartir el archivo.');
    }
    await Sharing.shareAsync(pdf.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: pdf.titulo,
    });
  }

  private mensajeError(status?: number): string {
    if (status === 401) return 'Tu sesión expiró. Volvé a iniciar sesión.';
    if (status === 400 || status === 404) return 'El comprobante no está disponible.';
    return 'No pudimos descargar el comprobante. Intentá de nuevo.';
  }
}
