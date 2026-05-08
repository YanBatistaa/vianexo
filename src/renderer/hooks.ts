import { type DependencyList, useEffect, useState } from "react";

export function useAsyncData<T>(loader: () => Promise<T>, deps: DependencyList, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loader()
      .then((result) => mounted && setData(result))
      .catch(() => mounted && setData(fallback))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
    // The caller owns the dependency list so this compact loader can be reused by every module.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading };
}
