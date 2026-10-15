// services/BaseService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../assets/config/config';
export abstract class BaseService {
  protected baseURL: string = `${API_URL}`;

  protected async getToken(): Promise<string> {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    return token;
  }

  // En BaseService.ts - versión mejorada
protected async fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await this.getToken();
  const url = `${this.baseURL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  
  if (response.status === 401) {
    // Token inválido o expirado
    await AsyncStorage.removeItem('access_token');
    throw new Error('Sesión expirada. Por favor, vuelve a iniciar sesión.');
  }
  
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}
}