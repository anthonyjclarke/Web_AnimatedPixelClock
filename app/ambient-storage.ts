// Store the user's selected PCA in this browser, independent of the server OS.
export async function customAnimationStorage(
  value?: { name: string; bytes: ArrayBuffer } | null,
): Promise<{ name: string; bytes: ArrayBuffer } | null> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('pixel-clock-ambient', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
          'files',
          value === undefined ? 'readonly' : 'readwrite',
        ),
        store = tx.objectStore('files');
      let result: { name: string; bytes: ArrayBuffer } | null = null;
      const request =
        value === undefined
          ? store.get('custom')
          : value === null
            ? store.delete('custom')
            : store.put(value, 'custom');
      request.onsuccess = () => {
        if (value === undefined) result = request.result ?? null;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
