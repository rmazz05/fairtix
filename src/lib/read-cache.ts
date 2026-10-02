// Share short-lived public reads within one server process. Owner balances are
// always read separately. Failed reads are removed so the next call can retry.
export function createReadCache<T>(load: () => Promise<T>, ttl: number) {
  let current: { expires: number; value: Promise<T> } | undefined;
  return {
    read() {
      if (current && current.expires > Date.now()) return current.value;
      const entry = { expires: Infinity, value: Promise.resolve().then(load) };
      current = entry;
      void entry.value.then(
        () => {
          entry.expires = Date.now() + ttl;
        },
        () => {
          if (current === entry) current = undefined;
        },
      );
      return entry.value;
    },
    invalidate() {
      current = undefined;
    },
  };
}
