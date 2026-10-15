// context/SujetoContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cuenta } from '../services/models';
import { useUsuario } from '../hooks/UsuarioHook';

const STORAGE_KEY = '@soltec:idCuentaSujetoSeleccionada';

interface SujetoContextData {
  cuentasSujeto: Cuenta[];
  cuentaSeleccionada: Cuenta | null;
  seleccionarCuenta: (idCuenta: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const SujetoContext = createContext<SujetoContextData | null>(null);

export const SujetoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: cuentasSujeto, loading: loadingCuentas, error: errorCuentas } = useUsuario('');
  const [idSeleccionado, setIdSeleccionado] = useState<string | null>(null);
  const [restaurando, setRestaurando] = useState(true);

  useEffect(() => {
    if (loadingCuentas) return;

    if (cuentasSujeto.length === 0) {
      setIdSeleccionado(null);
      setRestaurando(false);
      return;
    }

    let cancelado = false;
    (async () => {
      const guardado = await AsyncStorage.getItem(STORAGE_KEY);
      const existeGuardado = !!guardado && cuentasSujeto.some((c) => c.idCuenta === guardado);
      const inicial = existeGuardado ? guardado! : cuentasSujeto[0].idCuenta;

      if (!cancelado) {
        // Usa función de actualización: si el usuario ya eligió una cuenta
        // mientras esto corría, no la pisamos.
        setIdSeleccionado((prev) => prev ?? inicial);
        setRestaurando(false);
      }
    })();

    return () => { cancelado = true; };
    // idSeleccionado NO va en deps a propósito: solo queremos restaurar una vez.
  }, [loadingCuentas, cuentasSujeto]);

  const seleccionarCuenta = async (idCuenta: string) => {
    setIdSeleccionado(idCuenta);
    await AsyncStorage.setItem(STORAGE_KEY, idCuenta);
  };

  const cuentaSeleccionada = cuentasSujeto.find((c) => c.idCuenta === idSeleccionado) ?? null;

  return (
    <SujetoContext.Provider
      value={{
        cuentasSujeto,
        cuentaSeleccionada,
        seleccionarCuenta,
        loading: loadingCuentas || restaurando,
        error: errorCuentas,
      }}
    >
      {children}
    </SujetoContext.Provider>
  );
};

export function useSujetoSeleccionado(): SujetoContextData {
  const ctx = useContext(SujetoContext);
  if (!ctx) {
    throw new Error('useSujetoSeleccionado debe usarse dentro de <SujetoProvider>');
  }
  return ctx;
}