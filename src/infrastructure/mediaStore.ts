/** Stockage de fichiers (audios, images) indexés par clé : « word:<mot> », « image:<mot> », « correct_1 »… */
export interface MediaStore {
  get(key: string): Promise<Blob | null>;
  put(key: string, blob: Blob): Promise<void>;
  delete(key: string): Promise<void>;
  clearPrefix(prefix: string): Promise<void>;
}

export class InMemoryMediaStore implements MediaStore {
  private readonly data = new Map<string, Blob>();

  async get(key: string): Promise<Blob | null> {
    return this.data.get(key) ?? null;
  }

  async put(key: string, blob: Blob): Promise<void> {
    this.data.set(key, blob);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async clearPrefix(prefix: string): Promise<void> {
    for (const key of [...this.data.keys()]) if (key.startsWith(prefix)) this.data.delete(key);
  }
}

const DB_NAME = 'arabicGamesPremium_v1'; // même base que l'ancienne application
const STORE = 'audios';

/** IndexedDB, avec repli sur la mémoire si elle est indisponible (navigation privée…). */
export class IndexedDbMediaStore implements MediaStore {
  private readonly fallback = new InMemoryMediaStore();
  private db: Promise<IDBDatabase | null> | null = null;

  private open(): Promise<IDBDatabase | null> {
    this.db ??= new Promise(resolve => {
      if (typeof indexedDB === 'undefined') return resolve(null);
      try {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return this.db;
  }

  private async run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = (await this.open())!;
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
    });
  }

  async get(key: string): Promise<Blob | null> {
    if (!(await this.open())) return this.fallback.get(key);
    return ((await this.run('readonly', s => s.get(key))) as Blob | undefined) ?? null;
  }

  async put(key: string, blob: Blob): Promise<void> {
    if (!(await this.open())) return this.fallback.put(key, blob);
    await this.run('readwrite', s => s.put(blob, key));
  }

  async delete(key: string): Promise<void> {
    if (!(await this.open())) return this.fallback.delete(key);
    await this.run('readwrite', s => s.delete(key));
  }

  async clearPrefix(prefix: string): Promise<void> {
    if (!(await this.open())) return this.fallback.clearPrefix(prefix);
    const keys = (await this.run('readonly', s => s.getAllKeys())) as IDBValidKey[];
    for (const key of keys) if (String(key).startsWith(prefix)) await this.delete(String(key));
  }
}
