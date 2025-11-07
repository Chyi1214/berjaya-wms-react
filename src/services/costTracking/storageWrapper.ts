// Storage Wrapper - Wraps Firebase Storage operations with cost tracking

import {
  uploadBytes as storageUploadBytes,
  getDownloadURL as storageGetDownloadURL,
  deleteObject as storageDeleteObject,
  getMetadata,
  StorageReference,
  UploadResult,
} from 'firebase/storage';
import { trackStorageUpload } from './costTracker';

// Add bandwidth tracking function
function trackStorageBandwidth(serviceName: string, functionName: string, bytes: number): void {
  // Track as storage operation with bandwidth metadata
  import('./costTracker').then(({ costTracker }) => {
    costTracker.trackOperation({
      serviceName,
      functionName: `${functionName}_download`,
      operationType: 'storage',
      count: 1,
      timestamp: new Date(),
      metadata: { bytes },
    });
  });
}

// Helper to extract service and function name from call stack
function getCallerInfo(): { serviceName: string; functionName: string } {
  const error = new Error();
  const stack = error.stack || '';
  const lines = stack.split('\n');

  for (let i = 2; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];

    const match = line.match(/at\s+(\w+)\.(\w+)/) || line.match(/(\w+)@(\w+)/);
    if (match) {
      return {
        serviceName: match[1],
        functionName: match[2],
      };
    }

    const fileMatch = line.match(/\/([^/]+Service|[^/]+Context)\.tsx?:/) ||
                      line.match(/\/([^/]+)\.ts:/);
    if (fileMatch) {
      return {
        serviceName: fileMatch[1],
        functionName: 'unknown',
      };
    }
  }

  return {
    serviceName: 'UnknownService',
    functionName: 'unknown',
  };
}

/**
 * Wrapped uploadBytes - Tracks storage upload operations
 */
export async function uploadBytes(
  ref: StorageReference,
  data: Blob | Uint8Array | ArrayBuffer,
  serviceName?: string,
  functionName?: string
): Promise<UploadResult> {
  const caller = serviceName && functionName ? { serviceName, functionName } : getCallerInfo();

  // Get byte size
  let bytes = 0;
  if (data instanceof Blob) {
    bytes = data.size;
  } else if (data instanceof Uint8Array) {
    bytes = data.byteLength;
  } else if (data instanceof ArrayBuffer) {
    bytes = data.byteLength;
  }

  const result = await storageUploadBytes(ref, data);

  // Track upload - safe mode
  try {
    trackStorageUpload(caller.serviceName, caller.functionName, bytes);
  } catch (trackingError) {
    console.error('⚠️ Cost tracking failed (non-critical):', trackingError);
  }

  return result;
}

/**
 * Wrapped getDownloadURL - Tracks download bandwidth (this is the expensive part!)
 * Downloads cost $0.12 per GB - much more than uploads (which are free)
 */
export async function getDownloadURL(
  ref: StorageReference,
  serviceName?: string,
  functionName?: string
): Promise<string> {
  const caller = serviceName && functionName ? { serviceName, functionName } : getCallerInfo();

  // Get download URL
  const url = await storageGetDownloadURL(ref);

  // Track download bandwidth - safe mode
  // This is critical for cost tracking since downloads are the expensive part
  try {
    const metadata = await getMetadata(ref);
    const bytes = metadata.size || 0;

    trackStorageBandwidth(caller.serviceName, caller.functionName, bytes);
  } catch (trackingError) {
    // Non-critical - don't block download if tracking fails
    console.warn('⚠️ Download tracking failed (non-critical):', trackingError);
  }

  return url;
}

/**
 * Wrapped deleteObject - No tracking needed (deletes are free)
 */
export async function deleteObject(
  ref: StorageReference
): Promise<void> {
  return storageDeleteObject(ref);
}

// Re-export Storage functions
export { ref, getStorage } from 'firebase/storage';
