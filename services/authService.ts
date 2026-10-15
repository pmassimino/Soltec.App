import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { API_URL } from '../assets/config/config';

interface JwtPayload {
  idUsuario: string;
  roles: string;
  exp?: number; // Expiración en segundos Unix
}

type SessionExpiredListener = () => void;

let sessionExpiredListeners: SessionExpiredListener[] = [];

export const AuthService = {
  // Suscripción para notificar a AppNavigator cuando la sesión muere
  onSessionExpired(listener: SessionExpiredListener): () => void {
    sessionExpiredListeners.push(listener);
    return () => {
      sessionExpiredListeners = sessionExpiredListeners.filter((l) => l !== listener);
    };
  },

  // Método auxiliar para disparar la expiración desde cualquier interceptor de API (p. ej. HTTP 401)
  notifySessionExpired() {
    this.logout();
    sessionExpiredListeners.forEach((listener) => listener());
  },

  async login(username: string, password: string): Promise<boolean> {
    const method = `${API_URL}/api/login`;

    try {
      const response = await fetch(method, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) throw new Error('Credenciales inválidas');

      const result = await response.json();
      const token = result.token;

      const decoded: JwtPayload = jwtDecode(token);
      const roles: string[] = JSON.parse(decoded.roles);

      if (!roles.includes('5')) {
        await this.logout();
        return false;
      }

      await AsyncStorage.setItem('access_token', token);
      return true;
    } catch (error) {
      console.error('Error de login:', error);
      return false;
    }
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('access_token');
  },

  async isLoggedIn(): Promise<boolean> {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) return false;

    try {
      const decoded: JwtPayload = jwtDecode(token);
      
      // 1. Validar expiración del JWT
      if (decoded.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp < currentTime) {
          await this.logout(); // Si expiró, se remueve el token
          return false;
        }
      }

      // 2. Validar rol
      const roles: string[] = JSON.parse(decoded.roles);
      return roles.includes('5');
    } catch (e) {
      await this.logout();
      return false;
    }
  },
};