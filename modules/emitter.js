// A tiny publish/subscribe helper so screens can react to each other without
// importing each other.
export function createEmitter() {
  const listeners = new Map();

  return {
    on(name, listener) {
      const current = listeners.get(name) || [];
      listeners.set(name, [...current, listener]);
      return () => listeners.set(name, (listeners.get(name) || []).filter((item) => item !== listener));
    },
    emit(name, ...args) {
      (listeners.get(name) || []).forEach((listener) => listener(...args));
    }
  };
}
