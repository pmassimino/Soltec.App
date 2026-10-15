// hooks/PendientesHook.ts
import { useMemo } from 'react';
import { useAsync } from './useAsync';
import { PendientesService } from '../services/PendientesService';
import { DocumentoPendiente } from '../services/models';

export type TipoPendiente = 'remitos' | 'facturas';

export function useDocumentosPendientes(tipo: TipoPendiente, idCuenta: string | undefined, refreshKey = 0) {
  const service = useMemo(() => new PendientesService(), []);

  return useAsync<DocumentoPendiente[]>(
    idCuenta ? () => (tipo === 'remitos' ? service.remitos(idCuenta) : service.facturas(idCuenta)) : null,
    [tipo, idCuenta, refreshKey]
  );
}
