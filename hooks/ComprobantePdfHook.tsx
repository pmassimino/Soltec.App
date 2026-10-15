// hooks/ComprobantePdfHook.tsx
import React, { useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { ComprobanteService, PdfDescargado } from '../services/ComprobanteService';
import { PdfViewerModal } from '../components/common/PdfViewerModal';

const mostrarError = (titulo: string, err: unknown, fallback: string) => {
  const msg = err instanceof Error ? err.message : fallback;
  if (Platform.OS === 'web') window.alert(msg);
  else Alert.alert(titulo, msg);
};

/**
 * Descarga de comprobantes en PDF con visor integrado.
 * Devuelve el id que se está descargando, la función para descargar y el visor para renderizar.
 */
export function useComprobantePdf(idCuenta: string | undefined) {
  const service = useMemo(() => new ComprobanteService(), []);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);
  const [pdfVisible, setPdfVisible] = useState<PdfDescargado | null>(null);

  const compartir = async (pdf: PdfDescargado) => {
    try {
      await service.compartirPdf(pdf);
    } catch (err) {
      mostrarError('Compartir', err, 'No se pudo compartir el comprobante.');
    }
  };

  const descargar = async (idTransaccion: string, tipo: string, numeroComprobante: string) => {
    if (!idCuenta || descargandoId) return;
    setDescargandoId(idTransaccion);
    try {
      const pdf = await service.descargarPdf(
        idTransaccion,
        tipo,
        idCuenta,
        numeroComprobante || `comprobante-${idTransaccion}`
      );
      // En web ya se abrió en otra pestaña; en el teléfono se muestra en el visor
      if (pdf) setPdfVisible(pdf);
    } catch (err) {
      mostrarError('Comprobante', err, 'No pudimos descargar el comprobante.');
    } finally {
      setDescargandoId(null);
    }
  };

  const visor = <PdfViewerModal pdf={pdfVisible} onClose={() => setPdfVisible(null)} onShare={compartir} />;

  return { descargandoId, descargar, visor };
}
