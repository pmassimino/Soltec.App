// hooks/CosechaHook.ts
import { useMemo } from 'react';
import { useAsync } from './useAsync';
import { CtaCteCerealService } from '../services/CtaCteCerealService';
import { Boleto, Certificado, Entrada, Liquidacion, MovimientoCereal } from '../services/models';

export function useMovimientosCereal(
  idCuenta: string | undefined,
  idCosecha: string | undefined,
  idSucursal: string | undefined,
  refreshKey = 0
) {
  const service = useMemo(() => new CtaCteCerealService(), []);

  return useAsync<MovimientoCereal[]>(
    idCuenta && idCosecha ? () => service.movimientos(idCuenta, idCosecha, idSucursal || undefined) : null,
    [idCuenta, idCosecha, idSucursal, refreshKey]
  );
}

export function useEntradasCereal(
  idCuenta: string | undefined,
  idCosecha: string | undefined,
  idSucursal: string | undefined,
  refreshKey = 0
) {
  const service = useMemo(() => new CtaCteCerealService(), []);

  return useAsync<Entrada[]>(
    idCuenta && idCosecha ? () => service.entradas(idCuenta, idCosecha, idSucursal || undefined) : null,
    [idCuenta, idCosecha, idSucursal, refreshKey]
  );
}

export function useLiquidacionesCereal(
  idCuenta: string | undefined,
  idCosecha: string | undefined,
  idSucursal: string | undefined,
  refreshKey = 0
) {
  const service = useMemo(() => new CtaCteCerealService(), []);

  return useAsync<Liquidacion[]>(
    idCuenta && idCosecha ? () => service.liquidaciones(idCuenta, idCosecha, idSucursal || undefined) : null,
    [idCuenta, idCosecha, idSucursal, refreshKey]
  );
}

export function useCertificadosCereal(
  idCuenta: string | undefined,
  idCosecha: string | undefined,
  idSucursal: string | undefined,
  refreshKey = 0
) {
  const service = useMemo(() => new CtaCteCerealService(), []);

  return useAsync<Certificado[]>(
    idCuenta && idCosecha ? () => service.certificados(idCuenta, idCosecha, idSucursal || undefined) : null,
    [idCuenta, idCosecha, idSucursal, refreshKey]
  );
}

export function useBoletosCereal(
  idCuenta: string | undefined,
  idCosecha: string | undefined,
  idSucursal: string | undefined,
  refreshKey = 0
) {
  const service = useMemo(() => new CtaCteCerealService(), []);

  return useAsync<Boleto[]>(
    idCuenta && idCosecha ? () => service.boletos(idCuenta, idCosecha, idSucursal || undefined) : null,
    [idCuenta, idCosecha, idSucursal, refreshKey]
  );
}
