import { useCallback, useEffect, useRef, useState } from "react";

interface LoadState<T> {
  version: string | null;
  data: T | null;
  error: unknown;
}

/**
 * Loads data for a page. Reloads when `key` changes or when `reload()` is called.
 * `loading` is derived (no setState inside the effect body).
 */
export function useLoad<T>(loader: () => Promise<T>, key: string) {
  const [counter, setCounter] = useState(0);
  const [state, setState] = useState<LoadState<T>>({ version: null, data: null, error: null });
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const version = `${key}#${counter}`;
  useEffect(() => {
    let active = true;
    loaderRef.current()
      .then((data) => active && setState({ version, data, error: null }))
      .catch((error: unknown) => active && setState((current) => ({ version, data: current.data, error })));
    return () => {
      active = false;
    };
  }, [version]);

  const reload = useCallback(() => setCounter((value) => value + 1), []);
  const setData = useCallback((data: T) => setState((current) => ({ ...current, data })), []);

  return { data: state.data, error: state.error, loading: state.version !== version, reload, setData };
}
