import { useEffect, useState } from 'react';

/**
 * Runs an async loader and tracks its result. `key` decides when to load again:
 * pass a string built from everything the loader depends on.
 */
export function useApi(loader, key) {
  const [state, setState] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    let live = true;
    loader().then(
      data => live && setState({ key, data, error: null }),
      error => live && setState({ key, data: null, error })
    );
    return () => { live = false; };
    // The loader is recreated every render; `key` captures what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const loading = state.key !== key;
  return { data: state.data, error: loading ? null : state.error, loading };
}
