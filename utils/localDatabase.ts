export const DB_NAME = 'TwelveReaderDB';
export const STORE_NAME = 'audioBlobs';
export const STORE_TIMINGS = 'timings';
export const DB_VERSION = 2;

export class LocalDatabase {
    private db: IDBDatabase | null = null;

    async init(): Promise<void> {
        if (this.db) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open IndexedDB');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
                if (!db.objectStoreNames.contains(STORE_TIMINGS)) {
                    db.createObjectStore(STORE_TIMINGS);
                }
            };
        });
    }

    async saveAudioBlob(id: string, blob: Blob): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(blob, id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getAudioBlob(id: string): Promise<Blob | null> {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result || null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteAudioBlob(id: string): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async saveTimings(id: string, timings: any[]): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_TIMINGS], 'readwrite');
            const store = transaction.objectStore(STORE_TIMINGS);
            const request = store.put(timings, id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getTimings(id: string): Promise<any[] | null> {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_TIMINGS], 'readonly');
            const store = transaction.objectStore(STORE_TIMINGS);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result || null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteTimings(id: string): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_TIMINGS], 'readwrite');
            const store = transaction.objectStore(STORE_TIMINGS);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

export const localDB = new LocalDatabase();
