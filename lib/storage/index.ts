/**
 * Storage seam — file/object storage behind a thin interface.
 *
 * P0 STUB — Per BUILD_SPEC §12, storage sits behind this interface so Supabase
 * Storage can be swapped for the company's object store later (selected via
 * STORAGE_PROVIDER). Used for CSV upload retention / export artifacts.
 */

export interface StorageAdapter {
  put(key: string, body: Uint8Array | string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
}

export function getStorageAdapter(): StorageAdapter {
  throw new Error("getStorageAdapter: implemented later (storage seam).");
}
