import { useState, useEffect } from "react";
import { Cuenta } from "../services/models";
import { UsuarioService } from "../services/UsuarioService";

export function useUsuario(idCuenta: string) {
  const [data, setData] = useState<Cuenta[]>([]);  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const service = new UsuarioService();

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await service.cuentas();
        if (isMounted) {
          setData(response);          
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error desconocido");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, loading, error };
}
