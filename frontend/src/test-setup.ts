/**
 * Réglages globaux des tests (Vitest).
 *
 * L'environnement de test tourne sous Node, où `localStorage` n'est pas disponible.
 * On fournit une implémentation en mémoire pour que les stores (thème, langue, auth)
 * puissent lire et écrire comme dans un navigateur.
 */
if (typeof (globalThis as { localStorage?: unknown }).localStorage === 'undefined') {
  let store: Record<string, string> = {};
  const memoire = {
    getItem: (cle: string): string | null => (cle in store ? store[cle] : null),
    setItem: (cle: string, valeur: string): void => {
      store[cle] = String(valeur);
    },
    removeItem: (cle: string): void => {
      delete store[cle];
    },
    clear: (): void => {
      store = {};
    },
    key: (index: number): string | null => Object.keys(store)[index] ?? null,
    get length(): number {
      return Object.keys(store).length;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoire,
    writable: true,
    configurable: true,
  });
}
