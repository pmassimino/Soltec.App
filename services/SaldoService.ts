// services/SaldoService.ts
import { BaseService } from './BaseService';
import { CuentaCorriente, SaldoResponse } from './models';

export class SaldoService extends BaseService {
  
  async estadoGeneral(idCuenta: string): Promise<SaldoResponse> {    
    try {
      // Suponiendo que el endpoint es /api/usuario/saldos/{idCuenta}
      const response: SaldoResponse = await this.fetchAPI(`/api/cuenta/${idCuenta}/resumen`);
      return response;
    } catch (error) {
      throw new Error(`SaldoService Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async obtenerSaldosPorCuenta(idCuenta: string): Promise<CuentaCorriente[]> {
    console.log("cuenta consultada :" + idCuenta);
    const saldos = await this.estadoGeneral(idCuenta);
    return saldos.ctaCte;
  }

  
}