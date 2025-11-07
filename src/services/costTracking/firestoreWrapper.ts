// Firestore Wrapper - Wraps Firestore operations with cost tracking
// Drop-in replacement for direct Firestore calls

import {
  getDocs as firestoreGetDocs,
  getDoc as firestoreGetDoc,
  setDoc as firestoreSetDoc,
  addDoc as firestoreAddDoc,
  updateDoc as firestoreUpdateDoc,
  deleteDoc as firestoreDeleteDoc,
  writeBatch as firestoreWriteBatch,
  onSnapshot as firestoreOnSnapshot,
  QuerySnapshot,
  DocumentSnapshot,
  Query,
  DocumentReference,
  Firestore,
  DocumentData,
  Unsubscribe,
  SetOptions,
} from 'firebase/firestore';

// Re-export Unsubscribe type for consumers
export type { Unsubscribe };
import { trackFirestoreRead, trackFirestoreWrite, trackFirestoreDelete } from './costTracker';

// Helper to extract service and function name from call stack
function getCallerInfo(): { serviceName: string; functionName: string } {
  const error = new Error();
  const stack = error.stack || '';
  const lines = stack.split('\n');

  // Try to extract from stack trace (format varies by browser)
  // Look for line containing service file name
  for (let i = 2; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];

    // Match patterns like "at ServiceName.functionName" or "ServiceName@functionName"
    const match = line.match(/at\s+(\w+)\.(\w+)/) || line.match(/(\w+)@(\w+)/);
    if (match) {
      return {
        serviceName: match[1],
        functionName: match[2],
      };
    }

    // Match file path patterns
    const fileMatch = line.match(/\/([^/]+Service|[^/]+Context)\.tsx?:/) ||
                      line.match(/\/([^/]+)\.ts:/);
    if (fileMatch) {
      const fileName = fileMatch[1];
      return {
        serviceName: fileName,
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
 * Wrapped getDocs - Tracks read operations
 */
export async function getDocs<T = DocumentData>(
  query: Query<T>,
  serviceName?: string,
  functionName?: string
): Promise<QuerySnapshot<T>> {
  const caller = serviceName && functionName ? { serviceName, functionName } : getCallerInfo();

  const snapshot = await firestoreGetDocs(query);
  const count = snapshot.size;

  // Track operation - safe mode (won't break user workflow if tracking fails)
  try {
    trackFirestoreRead(caller.serviceName, caller.functionName, count);
  } catch (trackingError) {
    console.error('⚠️ Cost tracking failed (non-critical):', trackingError);
  }

  return snapshot;
}

/**
 * Wrapped getDoc - Tracks single document read
 */
export async function getDoc<T = DocumentData>(
  reference: DocumentReference<T>,
  serviceName?: string,
  functionName?: string
): Promise<DocumentSnapshot<T>> {
  const caller = serviceName && functionName ? { serviceName, functionName } : getCallerInfo();

  const snapshot = await firestoreGetDoc(reference);

  // Count as 1 read - safe mode
  try {
    trackFirestoreRead(caller.serviceName, caller.functionName, 1);
  } catch (trackingError) {
    console.error('⚠️ Cost tracking failed (non-critical):', trackingError);
  }

  return snapshot;
}

/**
 * Wrapped setDoc - Tracks write operations
 * Supports both 3-parameter (ref, data, options) and named parameter styles
 */
export async function setDoc<T = DocumentData>(
  reference: DocumentReference<T>,
  data: T,
  optionsOrServiceName?: SetOptions | string,
  functionName?: string
): Promise<void> {
  let options: SetOptions | undefined;
  let caller: { serviceName: string; functionName: string };

  // Determine if third parameter is options or serviceName
  if (typeof optionsOrServiceName === 'string') {
    // It's serviceName
    caller = { serviceName: optionsOrServiceName, functionName: functionName || 'unknown' };
    options = undefined;
  } else if (typeof optionsOrServiceName === 'object' && optionsOrServiceName !== null) {
    // It's SetOptions
    options = optionsOrServiceName;
    caller = getCallerInfo();
  } else {
    // No options provided
    options = undefined;
    caller = getCallerInfo();
  }

  // Call firestore with or without options
  if (options) {
    await firestoreSetDoc(reference, data, options);
  } else {
    await firestoreSetDoc(reference, data);
  }

  // Track write - safe mode
  try {
    trackFirestoreWrite(caller.serviceName, caller.functionName, 1);
  } catch (trackingError) {
    console.error('⚠️ Cost tracking failed (non-critical):', trackingError);
  }
}

/**
 * Wrapped addDoc - Tracks write operations
 */
export async function addDoc<T = DocumentData>(
  reference: any,
  data: T,
  serviceName?: string,
  functionName?: string
): Promise<DocumentReference<T>> {
  const caller = serviceName && functionName ? { serviceName, functionName } : getCallerInfo();

  const docRef = await firestoreAddDoc(reference, data);

  // Track write - safe mode
  try {
    trackFirestoreWrite(caller.serviceName, caller.functionName, 1);
  } catch (trackingError) {
    console.error('⚠️ Cost tracking failed (non-critical):', trackingError);
  }

  return docRef;
}

/**
 * Wrapped updateDoc - Tracks write operations
 */
export async function updateDoc<T = DocumentData>(
  reference: DocumentReference<T>,
  data: Partial<T>,
  serviceName?: string,
  functionName?: string
): Promise<void> {
  const caller = serviceName && functionName ? { serviceName, functionName } : getCallerInfo();

  await firestoreUpdateDoc(reference, data as any);

  // Track write - safe mode
  try {
    trackFirestoreWrite(caller.serviceName, caller.functionName, 1);
  } catch (trackingError) {
    console.error('⚠️ Cost tracking failed (non-critical):', trackingError);
  }
}

/**
 * Wrapped deleteDoc - Tracks delete operations
 */
export async function deleteDoc<T = DocumentData>(
  reference: DocumentReference<T>,
  serviceName?: string,
  functionName?: string
): Promise<void> {
  const caller = serviceName && functionName ? { serviceName, functionName } : getCallerInfo();

  await firestoreDeleteDoc(reference);

  // Track delete - safe mode
  try {
    trackFirestoreDelete(caller.serviceName, caller.functionName, 1);
  } catch (trackingError) {
    console.error('⚠️ Cost tracking failed (non-critical):', trackingError);
  }
}

/**
 * Wrapped writeBatch - Returns a tracked batch
 */
export function writeBatch(db: Firestore, serviceName?: string, functionName?: string) {
  const caller = serviceName && functionName ? { serviceName, functionName } : getCallerInfo();
  const batch = firestoreWriteBatch(db);

  // Wrap the commit method to track operations
  const originalCommit = batch.commit.bind(batch);
  let writeCount = 0;
  let deleteCount = 0;

  // Override set/update methods to count operations
  const originalSet = batch.set.bind(batch);
  const originalUpdate = batch.update.bind(batch);
  const originalDelete = batch.delete.bind(batch);

  batch.set = (ref: any, data: any, options?: any) => {
    writeCount++;
    if (options) {
      return originalSet(ref, data, options);
    }
    return originalSet(ref, data);
  };

  batch.update = (ref: any, data: any) => {
    writeCount++;
    return originalUpdate(ref, data);
  };

  batch.delete = (ref: any) => {
    deleteCount++;
    return originalDelete(ref);
  };

  batch.commit = async () => {
    const result = await originalCommit();

    // Track operations after successful commit - safe mode
    try {
      if (writeCount > 0) {
        trackFirestoreWrite(caller.serviceName, caller.functionName, writeCount);
      }
      if (deleteCount > 0) {
        trackFirestoreDelete(caller.serviceName, caller.functionName, deleteCount);
      }
    } catch (trackingError) {
      console.error('⚠️ Cost tracking failed (non-critical):', trackingError);
    }

    return result;
  };

  return batch;
}

/**
 * Wrapped onSnapshot - Query overload
 */
export function onSnapshot<T = DocumentData>(
  reference: Query<T>,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: Error) => void
): Unsubscribe;

/**
 * Wrapped onSnapshot - DocumentReference overload
 */
export function onSnapshot<T = DocumentData>(
  reference: DocumentReference<T>,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: Error) => void
): Unsubscribe;

/**
 * Wrapped onSnapshot - Implementation
 */
export function onSnapshot<T = DocumentData>(
  reference: Query<T> | DocumentReference<T>,
  onNext: ((snapshot: QuerySnapshot<T>) => void) | ((snapshot: DocumentSnapshot<T>) => void),
  onErrorCallback?: (error: Error) => void
): Unsubscribe {
  const caller = getCallerInfo();

  // Check if it's a DocumentReference or Query
  const isDocRef = 'type' in reference && reference.type === 'document';

  if (isDocRef) {
    // Handle DocumentReference
    const wrappedOnNext = (snapshot: DocumentSnapshot<T>) => {
      // Track as 1 read - safe mode
      try {
        trackFirestoreRead(caller.serviceName, `${caller.functionName}_listener`, 1);
      } catch (trackingError) {
        console.error('⚠️ Cost tracking failed (non-critical):', trackingError);
      }

      // Call original callback
      (onNext as (snapshot: DocumentSnapshot<T>) => void)(snapshot);
    };

    // Call firestore with or without error callback
    if (onErrorCallback) {
      return firestoreOnSnapshot(reference as DocumentReference<T>, wrappedOnNext, onErrorCallback);
    } else {
      return firestoreOnSnapshot(reference as DocumentReference<T>, wrappedOnNext);
    }
  } else {
    // Handle Query
    const wrappedOnNext = (snapshot: QuerySnapshot<T>) => {
      // Track each snapshot as reads - safe mode
      try {
        const count = snapshot.size;
        trackFirestoreRead(caller.serviceName, `${caller.functionName}_listener`, count);
      } catch (trackingError) {
        console.error('⚠️ Cost tracking failed (non-critical):', trackingError);
      }

      // Call original callback
      (onNext as (snapshot: QuerySnapshot<T>) => void)(snapshot);
    };

    // Call firestore with or without error callback
    if (onErrorCallback) {
      return firestoreOnSnapshot(reference as Query<T>, wrappedOnNext, onErrorCallback);
    } else {
      return firestoreOnSnapshot(reference as Query<T>, wrappedOnNext);
    }
  }
}

// Re-export commonly used Firestore functions that don't need wrapping
export { collection, doc, query, orderBy, where, limit, Timestamp } from 'firebase/firestore';
