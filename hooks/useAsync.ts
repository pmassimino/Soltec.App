// hooks/useAsync.ts
import { useEffect, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Ejecuta `fetcher` cada vez que cambian las `deps`. Si `fetcher` es null,
 * no hace nada (útil para "todavía no tengo idCuenta").
 */
export function useAsync<T>(
  fetcher: (() => Promise<T>) | null,
  deps: React.DependencyList
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: !!fetcher, error: null });

  useEffect(() => {
    if (!fetcher) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelado = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetcher()
      .then((data) => { if (!cancelado) setState({ data, loading: false, error: null }); })
      .catch((err) => {
        if (!cancelado) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          setState({ data: null, loading: false, error: msg });
        }
      });

    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}