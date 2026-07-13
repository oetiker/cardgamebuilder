// Uploaded pictures are stored as data URLs in IndexedDB (too large for
// localStorage). Decoded HTMLImageElements are cached in memory for drawing.

const DB_NAME = 'cardgamebuilder';
const STORE = 'images';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function putImage(id: string, dataUrl: string): Promise<void> {
  bitmapCache.delete(id);
  return tx('readwrite', (s) => s.put(dataUrl, id)).then(() => undefined);
}

export function getImage(id: string): Promise<string | undefined> {
  return tx<string | undefined>('readonly', (s) => s.get(id));
}

export function deleteImage(id: string): Promise<void> {
  bitmapCache.delete(id);
  return tx('readwrite', (s) => s.delete(id)).then(() => undefined);
}

export function allImageIds(): Promise<string[]> {
  return tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys()).then((keys) =>
    keys.map((k) => String(k)),
  );
}

const bitmapCache = new Map<string, HTMLImageElement>();

function decode(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image decode failed'));
    img.src = dataUrl;
  });
}

/** Decode and cache all image symbols referenced by the given ids. */
export async function ensureBitmaps(imageIds: string[]): Promise<void> {
  const missing = imageIds.filter((id) => !bitmapCache.has(id));
  await Promise.all(
    missing.map(async (id) => {
      const data = await getImage(id);
      if (!data) return;
      try {
        bitmapCache.set(id, await decode(data));
      } catch {
        /* ignore broken images */
      }
    }),
  );
}

export function getBitmap(id: string): HTMLImageElement | undefined {
  return bitmapCache.get(id);
}

/** Read a File into a resized data URL (keeps storage and PDFs reasonable). */
export function fileToDataUrl(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        // PNG preserves transparency (clip-art); fall back gracefully.
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('decode failed'));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
