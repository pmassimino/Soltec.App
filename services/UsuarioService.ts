import { BaseService } from './BaseService';
import { Cuenta, ApiResponse } from '../services/models'

export class UsuarioService extends BaseService {
  
  async cuentas(): Promise<Cuenta[]> {
    try {
      const response: Cuenta[] = await this.fetchAPI('/api/usuario/cuentas');      
      
      return response || [];
    } catch (error) {
      throw new Error(`UsuarioService Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }


}