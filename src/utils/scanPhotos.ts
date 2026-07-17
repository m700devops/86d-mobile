import * as FileSystem from 'expo-file-system/legacy';

// Camera captures land in the OS cache directory, which iOS can evict under
// memory pressure at any time — exactly the moment a scan is mid-flight and
// might need a retry. Copy into the app's document directory instead, which
// isn't subject to that eviction, so a retry can still find the photo even
// after the app was backgrounded/killed and relaunched.

const SCAN_PHOTOS_DIR = `${FileSystem.documentDirectory}scan-photos/`;
let dirReadyPromise: Promise<void> | null = null;

function ensureDir(): Promise<void> {
  if (!dirReadyPromise) {
    dirReadyPromise = FileSystem.makeDirectoryAsync(SCAN_PHOTOS_DIR, { intermediates: true }).catch(() => {});
  }
  return dirReadyPromise;
}

// Copies a captured (ephemeral) photo into durable storage. Falls back to the
// original URI on any failure — a scan can still proceed with an ephemeral
// photo, it just loses the durability guarantee if this specific copy fails.
export async function persistScanPhoto(sourceUri: string): Promise<string> {
  try {
    await ensureDir();
    const dest = `${SCAN_PHOTOS_DIR}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return dest;
  } catch {
    return sourceUri;
  }
}

// Best-effort cleanup once a photo is no longer needed (scan resolved, row
// removed, draft cleared) — never throws, a leaked file just costs disk space,
// not correctness.
export async function deleteScanPhoto(uri: string | undefined | null): Promise<void> {
  if (!uri || !uri.startsWith(SCAN_PHOTOS_DIR)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}
