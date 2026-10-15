import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING } from '../../constants/theme';
import { PdfDescargado } from '../../services/ComprobanteService';
import { Button, EmptyState } from '../ui';

// Android no muestra PDFs en un WebView, así que se renderizan con PDF.js (igual en iOS)
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';

const htmlVisor = (base64: string) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
<style>
  html, body { margin: 0; padding: 0; background: #e9edf2; }
  #paginas { padding: 8px; }
  canvas { display: block; width: 100%; margin: 0 auto 8px; background: #fff;
           box-shadow: 0 1px 4px rgba(11,37,69,.15); border-radius: 4px; }
</style>
<script src="${PDFJS}/pdf.min.js"></script>
</head>
<body>
<div id="paginas"></div>
<script>
  const avisar = (m) => window.ReactNativeWebView.postMessage(JSON.stringify(m));
  (async () => {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS}/pdf.worker.min.js';
      const datos = Uint8Array.from(atob(${JSON.stringify(base64)}), (c) => c.charCodeAt(0));
      const pdf = await pdfjsLib.getDocument({ data: datos }).promise;
      const contenedor = document.getElementById('paginas');
      const ancho = contenedor.clientWidth - 16;
      const dpr = window.devicePixelRatio || 1;
      for (let n = 1; n <= pdf.numPages; n++) {
        const pagina = await pdf.getPage(n);
        const base = pagina.getViewport({ scale: 1 });
        const viewport = pagina.getViewport({ scale: (ancho / base.width) * dpr });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        contenedor.appendChild(canvas);
        await pagina.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        if (n === 1) avisar({ tipo: 'listo' });
      }
    } catch (e) {
      avisar({ tipo: 'error', mensaje: String(e && e.message || e) });
    }
  })();
</script>
</body>
</html>`;

interface PdfViewerModalProps {
  pdf: PdfDescargado | null;
  onClose: () => void;
  onShare: (pdf: PdfDescargado) => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ pdf, onClose, onShare }) => {
  const insets = useSafeAreaInsets();
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const html = useMemo(() => (pdf ? htmlVisor(pdf.base64) : ''), [pdf]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      setEstado(msg.tipo === 'listo' ? 'listo' : 'error');
    } catch {
      // mensaje inesperado: se ignora
    }
  };

  return (
    <Modal
      visible={!!pdf}
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setEstado('cargando')}
      statusBarTranslucent
    >
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.headerButton} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={22} color={COLORS.white} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>{pdf?.titulo ?? 'Comprobante'}</Text>
          <Pressable
            onPress={() => pdf && onShare(pdf)}
            hitSlop={10}
            style={styles.headerButton}
            accessibilityLabel="Compartir"
          >
            <Ionicons name="share-outline" size={20} color={COLORS.white} />
          </Pressable>
        </View>

        {pdf && (
          <View style={styles.body}>
            <WebView
              originWhitelist={['*']}
              source={{ html }}
              onMessage={onMessage}
              onError={() => setEstado('error')}
              style={styles.webview}
              setBuiltInZoomControls
              setDisplayZoomControls={false}
            />

            {estado === 'cargando' && (
              <View style={styles.overlay}>
                <ActivityIndicator size="large" color={COLORS.navy} />
                <Text style={styles.overlayText}>Abriendo comprobante…</Text>
              </View>
            )}

            {estado === 'error' && (
              <View style={[styles.overlay, { padding: SPACING.xl }]}>
                <EmptyState
                  icon="document-outline"
                  title="No pudimos mostrar el PDF"
                  message="Podés abrirlo con otra aplicación desde Compartir."
                />
                <Button
                  label="Compartir / abrir con…"
                  icon="share-outline"
                  variant="secondary"
                  onPress={() => onShare(pdf)}
                  style={{ marginTop: SPACING.lg, alignSelf: 'stretch' }}
                />
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e9edf2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.navySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { flex: 1, color: COLORS.white, fontSize: 16, fontWeight: '700', marginHorizontal: SPACING.md },
  body: { flex: 1 },
  webview: { flex: 1, backgroundColor: 'transparent' },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#e9edf2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: { marginTop: SPACING.md, fontSize: 14, color: COLORS.textGray },
});
