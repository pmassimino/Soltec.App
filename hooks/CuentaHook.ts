// hooks/CuentaHook.ts
import { useMemo } from 'react';
import { useAsync } from './useAsync';
import { SaldoService } from '../services/SaldoService';
import { SaldoResponse } from '../services/models';

export function useCuenta(idCuenta?: string) {
  const service = useMemo(() => new SaldoService(), []);

  const { data, loading, error } = useAsync<SaldoResponse>(
    idCuenta ? () => service.estadoGeneral(idCuenta) : null,
    [idCuenta]
  );

  return { data, cuentas: data?.ctaCte ?? [], loading, error };
}