// hooks/MovimientosHook.ts
import { useMemo } from 'react';
import { useAsync } from './useAsync';
import { CtaCteService } from '../services/CtaCteService';
import { Movimiento } from '../services/models';

export function useMovimientos(
  idCuenta: string | undefined,
  idSubdiario: string | undefined,
  dias: number,
  idDivisa: number,
  refreshKey = 0
) {
  const service = useMemo(() => new CtaCteService(), []);

  return useAsync<Movimiento[]>(
    idCuenta && idSubdiario
      ? () => {
          const hasta = new Date();
          const desde = new Date();
          desde.setDate(hasta.getDate() - dias);
          return service.movimientos(idCuenta, idSubdiario, desde, hasta, idDivisa);
        }
      : null,
    [idCuenta, idSubdiario, dias, idDivisa, refreshKey]
  );
}
